var Discord = require("discord.js");
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var phantomScripts = require('./phantomScripts.js');
var winston = require('winston');
var validUrl = require('valid-url');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':true})
    ]
});

var mybot = new Discord.Client();
var command = require('./commandRepository.js');
var allowable_extensions = ['jpeg','jpg','png','gif'];

mybot.on("message", function(message){
    if(message.mentions.length > 0) return;
    var matches = message.content.match(/!(\w+)/);
    if(matches && matches.length == 2){
        var keyword= matches[1];
        var params = getParams(message.content, keyword);
        switch(keyword){
            case 'roll' :
                if(params.length == 0){
                    mybot.reply(message, Math.ceil(Math.random() * 6) + " [0 - " + 6 + "]");
                }
                if(params.length > 0){
                    if(!isNaN(params[0])){
                        var upperBound = +params[0];
                        //is this an int
                        if(upperBound % 1 === 0){
                            mybot.reply(message, Math.ceil(Math.random() * upperBound) + " [0 - " + upperBound + "]");
                        }
                    }
                }
                break;
            case 'audit':
                runAudit(message);
                logger.info('Audit message');
                break;
            case 'save':
                if(params.length < 2) return;
                var commandParam = params[0].toLowerCase();
                var uriParam = params[1];
                if(commandParam && typeof commandParam === 'string' && commandParam.length > 0 && validUrl.is_uri(uriParam)) {
                    if (allowable_extensions.indexOf(uriParam.split('.').pop()) == -1) {
                        return;
                    }
                    if(commandParam === "red" || commandParam === "redlorr"){
                        return;
                    }
                    command.save(commandParam, uriParam, message.author.id).then(function(){
                        mybot.sendMessage(message.channel, "Saved new command: " + commandParam);
                    }).catch(function(err){
                        logger.info(err);
                    });

                }
                else{
                    return;
                }
                break;
            default:
                if(keyword && typeof keyword === 'string' && keyword.length > 0){
                    command.fetch(keyword.toLowerCase()).then(function(results){
                        var img = {};
                        if(results.length == 0) return;
                        else if(results.length > 1){
                            img = results[Math.floor(Math.random()*results.length)];
                        }else{
                            img = results[0];
                        }
                        mybot.sendFile(message.channel, img.url, "image."+img.url.split('.').pop());
                    })
                }
        }
    }
});

var getParams = function(messageString, command) {
    logger.info("getting params");
    var words = messageString.split(' ');
    logger.info("words:",words);
    var commandIndex = words.indexOf('!'+command);
    if (commandIndex == (words.length - 1) || commandIndex < 0) {
        return [];
    }
    var results = [];
    for (var i = commandIndex + 1; i < words.length; i++) {
        results.push(words[i]);
    }
    logger.info(results);
    return results;
};

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
