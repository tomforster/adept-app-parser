/**
 * Created by Tom on 28/06/2016.
 */

const appParser = require('./applicationParser.js');
const applicationRepository = require('./repositories/applicationRepository');
const config = require('./config');
const log = require('bristol');
const rp = require('request-promise');
const crypto = require("crypto");
const cron = require("node-cron");

let discordBot = null;

module.exports = function(bot){
    discordBot = bot;

    log.info("Adding scheduled task to retrieve applications");
    cron.schedule('*/2 * * * *', () => {
        checkForNewApplications().catch(log.error);
    }, true);

    log.info("Adding scheduled task to post applications");
    cron.schedule('*/1 * * * *', () => {
        postNewApplications().catch(log.error);
    }, true);
};

function checkForNewApplications(){
    let questionPromise = getQuestions();
    let entriesPromise = getEntries();
    let mostRecentIdPromise = applicationRepository.getLatestApplicationId();

    return Promise.all([questionPromise, entriesPromise, mostRecentIdPromise])
        .then(result => {
            let questions = result[0];
            let latestEntries = result[1];
            let mostRecentId = result[2].id;

            latestEntries = latestEntries.filter(entry => entry.id > mostRecentId);

            if(latestEntries.length > 0){
                log.info("Detected new application(s).", latestEntries.length);
            }

            return latestEntries.map(entry => {
                let currentSection, sections = [];
                currentSection = {label:"Personal Information", questions:[]};
                sections.push(currentSection);
                questions.forEach(question => {
                    if(question.type === "section") {
                        currentSection = {label:question.label, questions:[]};
                        sections.push(currentSection);
                    } else if(question.type === "checkbox"){
                        if(question.label.indexOf("role") >= 0){

                        }
                        let inputs = question.inputs.filter(input => entry[input.id] && entry[input.id].length > 0)
                            .map(input => entry[input.id]);

                        if(inputs && inputs.length > 0){
                            currentSection.questions.push({label: question.label, answer:inputs})
                        }
                    } else {
                        if (entry[question.id] && entry[question.id].length > 0) {
                            currentSection.questions.push({label: question.label, answer:entry[question.id]})
                        }
                    }
                });
                return {id: entry.id, date: Math.floor(Date.parse(entry.date_created)/1000), sections:sections.filter(section => section.questions.length > 0)};
            });
        })
        .then(applications => {
            applications.forEach(application => {
                let processedApp = appParser.process(application.sections);

                applicationRepository.save(application.id, application.date, processedApp.character, application.sections, processedApp)
                    .catch(function(err){
                        log.error("Failed to save new application", err);
                    });
            });
        })
}

function postNewApplications(){
    return applicationRepository.getPendingApplications().then(applicationQueue => {

        if(applicationQueue.length > 0){
            log.info("Detected pending application(s).", applicationQueue.length);
            return postApplicationsFromQueue(applicationQueue);
        }


    });
}

function postApplicationsFromQueue(applicationQueue) {
    if (applicationQueue.length > 0) {
        let application = applicationQueue.pop();
        postApp(application.processed_app).then(url => {
            log.info("posted app", application.processed_app.title);
            applicationRepository.markApplicationAsPosted(application.id, url).catch(log.error);
            if (discordBot) {
                discordBot.newAppMessage(application.processed_app.title, url).catch(log.error);
            }
            return postApplicationsFromQueue(applicationQueue);
        }).catch(log.error)
    }
}


function doGravityFormsRequest(route){
    let d = new Date,
        expiration = 500,
        unixTime = parseInt(d.getTime() / 1000),
        futureUnixTime = unixTime + expiration,
        publicKey = config.gravityPublicKey,
        privateKey = config.gravityPrivateKey,
        method = "GET";

    let stringToSign = publicKey + ":" + method + ":" + route + ":" + futureUnixTime;
    let sig = encodeURIComponent(crypto.createHmac('sha1', privateKey).update(stringToSign).digest('base64'));
    let requestString = `http://adepteu.com/gravityformsapi/${route}?api_key=${publicKey}&signature=${sig}&expires=${futureUnixTime}`;

    return rp(requestString).then(result => JSON.parse(result).response);
}

function getQuestions(){
    return doGravityFormsRequest("forms/1")
        .then(result => result.fields);
}

function getEntries(){
    return doGravityFormsRequest("forms/1/entries")
        .then(result => result.entries);
}

const puppeteer = require('puppeteer');

const postApp = async function(mailObj){
    log.info('Posting Adept App');
    const username = config.forumUsername;
    const password = config.forumPassword;
    let url = null;
    let page, browser;

    try {
        browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
        page = await browser.newPage();
        await page.goto(config.forumUrl, {waitUntil: 'networkidle0'});
        const title = await page.evaluate(() => document.querySelector('title').innerText);
        if (title.indexOf('Login') > -1) {
            log.info("logging in");
            await page.type('#username', username);
            await page.type('#password', password);
            await page.click('.button[name=login]', {delay: 2000});
            await page.waitForSelector('#subject', {waitUntil: 'networkidle0'});
        }
        log.info("saving");
        await page.type('#subject', mailObj.title);
        await page.evaluate(body => {
            document.querySelector('#message').innerText = body;
        }, mailObj.body);
        await page.click('[type=submit][name=post]', {delay: 2000});
        await page.waitForSelector('.postbody', {waitUntil: 'networkidle0'});
        url = await page.url();
        log.info("saved");
    } catch (error){
        log.error(error);
        if(page) page.screenshot({path: 'fail.png'});
        throw "failed to post";
    } finally {
        if(page) page.close();
        if(browser) browser.close();
    }
    return url;
};