/**
 * Created by Tom on 28/06/2016.
 */

const appParser = require('./application.js');
const phantomScripts = require('./phantomScripts.js');
const applicationRepository = require('./repositories/applicationRepository');
const config = require('./config');
const log = require('bristol');
const fs = require('fs');
const rp = require('request-promise');
const crypto = require("crypto");
const moment = require("moment");
const cron = require("node-cron");

const router = require('express').Router();
let discordBot = null;

module.exports = function(bot){
    discordBot = bot;
    router.get('/', function(req, res) {
        log.info('Parser request');
        res.sendFile(path.join(__dirname,'/public/parser.html'));
    });

    log.info("Adding scheduled task to retrieve applications");
    cron.schedule('*/2 * * * *', () => {
        checkForNewApplications().catch(log.error);
    }, true);

    log.info("Adding scheduled task to post applications");
    cron.schedule('*/5 * * * *', () => {
        postNewApplications().catch(log.error);
    }, true);

    return router;
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
                return {id: entry.id, date: moment.utc(entry.date_created, "YYYY-MM-DD HH:mm:ss").unix(), sections:sections.filter(section => section.questions.length > 0)};
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
        phantomScripts.postApp(application.processed_app).then(url => {
            applicationRepository.markApplicationAsPosted(application.id, url).catch(log.error);
            if (discordBot) {
                return discordBot.newAppMessage(application.title, url);
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