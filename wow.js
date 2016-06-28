/**
 * Created by Tom on 28/06/2016.
 */

var mailin = require('mailin');
var appParser = require('./appParser.js');
var discordBot = require('./discordBot.js');
var phantomScripts = require('./phantomScripts.js');
var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':true})
    ]
});

module.exports = function(app, startBot, startMail){
    app.get('/parser', function(req, res) {
        logger.info('parserReq');
        res.sendFile(path.join(__dirname,'/public/parser.html'));
    });

    if(startMail){
        mailin.start({
            port: 25,
            host: '0.0.0.0',
            disableWebhook: true
        },function(err){
            if(err) logger.info(err);
        });

        mailin.on('startMessage', function (connection) {
            logger.info(JSON.stringify(connection));
        });
    }

    if(startBot){
        mailin.on('message', function (connection, data, content) {
            if(connection.envelope.rcptTo.filter(function(rcpt){
                    return rcpt.address == config.appEmail
                }).length < 1){
                logger.info('bad email: '+JSON.stringify(connection.envelope.rcptTp));
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
            logger.info('Title:'+mailObj.title);

            phantomScripts.postApp(mailObj).then(function(url){
                discordBot.newAppMessage(mailObj.title,url);
            });
        });
    }
};