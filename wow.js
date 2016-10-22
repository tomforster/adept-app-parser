/**
 * Created by Tom on 28/06/2016.
 */

var mailin = require('mailin');
var appParser = require('./appParser.js');
var phantomScripts = require('./phantomScripts.js');
var applicationRepository = require('./repositories/applicationRepository');
var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
const log = require('better-logs')('wow');

var router = require('express').Router();

module.exports = function(startBot, startMail){
    router.get('/parser', function(req, res) {
        log.info('Parser request');
        res.sendFile(path.join(__dirname,'/public/parser.html'));
    });

    var discordBot = null;
    if(startBot){
        discordBot = require('./discordBot.js');
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

        mailin.on('message', function (connection, data, content) {
            if(connection.envelope.rcptTo.filter(function(rcpt){
                    return rcpt.address == config.appEmail
                }).length < 1){
                log.info('bad email: '+JSON.stringify(connection.envelope.rcptTp));
                return;
            }
            var cheerio = require('cheerio');
            var $ = cheerio.load(data.html);
            var str = "";
            $('table table td').each(function (index, obj) {
                var li = $(obj).find('li');
                if (li.length > 0) {
                    $(li).each(function (index, obj) {
                        str += $(obj).text() + '\n';
                    });
                } else {
                    if ($(obj).text().trim().length !== 0) {
                        str += $(obj).text().trim() + '\n';
                    }
                }
            });
            str = str.replace(/\s{2,}/g, ' ');
            var mailObj = appParser.parseText(str);
            log.info('Title:'+mailObj.title);

            phantomScripts.postApp(mailObj).then(function(url){
                if(discordBot) {
                    discordBot.newAppMessage(mailObj.title, url);
                }
            });

            applicationRepository.save(mailObj.raw);
        });
    }
    return router;
};