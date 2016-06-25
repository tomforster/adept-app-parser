var Discord = require("discord.js");
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var phantomScripts = require('./phantomScripts.js');
var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':true})
    ]
});

var mybot = new Discord.Client();

mybot.on("message", function(message){
    if(message.author.id === "99435952493072384") return;
    var matches = message.content.match(/!(\w+)/);
    if(matches && matches.length == 2){
        var keyword= matches[1];
        switch(keyword){
            case 'audit': runAudit(message);
                logger.info('Audit message');
                break;
            case 'yes': mybot.sendFile(message.channel, "http://upload.evocdn.co.uk/cafereality/uploads/asset_image/2_203.jpg", "yes.jpg");
                break;
            case 'no': mybot.sendFile(message.channel, "https://zbeads.files.wordpress.com/2014/11/grumpy-cat-no-1.jpg","no.jpg");
                break;
            case 'nein': mybot.sendFile(message.channel, "http://i.imgur.com/sMQoX48.gif", "nein.gif");
        }
    }
});

var login = function(){
    mybot.login(config.discordEmail, config.discordPassword).then(function(result){

    }).catch(function(error){
        setTimeout(login,30*1000);
    });
};

login();

mybot.on("disconnected", login);

var runAudit = function(message){
    mybot.sendMessage(message.channel, 'One second...');

    phantomScripts.readAudit().then(function(auditInfo){
        logger.info("Audit promise returned");
        var bads = auditInfo.characterData.filter(function(player){
            return player.audit !== '0' || player.upgrades !== '100';
        });
        var opString = "";
        bads.forEach(function(bad){
            if(bad.upgrades !== '100'){
                opString += bad.name + " is only " +bad.upgrades +"% upgraded. ";
            }
            if(bad.audit !== '0'){
                opString += bad.name + " is missing an enchant or a gem! ";
            }
        });
        if(bads.length == 0){
            opString += 'I must be malfunctioning, everyone passed the audit! :o'
        }
        if(auditInfo.lastCheck.length > 0){
            opString += " (Data last refreshed: " + auditInfo.lastCheck +')';
        }
        logger.info(opString);
        mybot.sendMessage(message.channel, opString);
    });
};

exports.newAppMessage = function(title,url){
    mybot.sendMessage(mybot.channels.get("name","guild"),"New Application Posted: "+ title + " " + url);
};
