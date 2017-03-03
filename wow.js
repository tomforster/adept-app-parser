/**
 * Created by Tom on 28/06/2016.
 */

const mailin = require('mailin');
const appParser = require('./appParser.js');
const phantomScripts = require('./phantomScripts.js');
const applicationRepository = require('./repositories/applicationRepository');
const config = require('./config');
const log = require('bristol');
const fs = require('fs');

const router = require('express').Router();
let discordBot = null;

module.exports = function(startBot, startMail){

    let mail = fs.readFileSync('mail.txt', 'utf-8');
    let mailObj = parseMail(mail);
    log.info(mailObj);

    router.get('/', function(req, res) {
        log.info('Parser request');
        res.sendFile(path.join(__dirname,'/public/parser.html'));
    });

    if(startBot){
        discordBot = require('./discord/discordBot.js');
    }

    if(startMail){
        mailin.start({
            port: 25,
            host: '0.0.0.0',
            disableWebhook: true
        },function(err){
            if(err) log.info(err);
        });

        mailin.on('startMessage', function (connection) {
            log.info(JSON.stringify(connection));
        });

        mailin.on('message', (connection, data, content) => {
            if(connection.envelope.rcptTo.filter(function(rcpt){
                    return rcpt.address == config.appEmail
                }).length < 1){
                log.info('bad email: '+JSON.stringify(connection.envelope.rcptTp));
                return;
            }
            parseMail(data.html)
        })
    }
    return router;
};

function parseMail(html) {

    let cheerio = require('cheerio');
    let $ = cheerio.load(html);
    let str = "";

    $('table table td').each(function (index, obj) {
        str += $(obj).text();
    });
    // str = str.replace(/\s{2,}/g, ' ');
    let mailObj = appParser.parseText(str);
    log.info('Title:'+mailObj.title);

    phantomScripts.postApp(mailObj).then(function(url){
        if(discordBot) {
            discordBot.newAppMessage(mailObj.title, url);
        }
    }).catch(function(err){
        log.error(err);
        log.error("Failed to save new application");
    });

    applicationRepository.save(mailObj.raw);
}