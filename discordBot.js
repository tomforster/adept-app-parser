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
    //if(message.author.id === "99435952493072384") return;
    if(message.mentions.length > 0) return;
    var matches = message.content.match(/!(\w+)/);
    if(matches && matches.length == 2){
        var keyword= matches[1];
        switch(keyword){
            case 'audit': runAudit(message);
                logger.info('Audit message');
                break;
            // case 'yes': mybot.sendFile(message.channel, "http://upload.evocdn.co.uk/cafereality/uploads/asset_image/2_203.jpg", "yes.jpg");
            //     break;
            // case 'no': mybot.sendFile(message.channel, "https://zbeads.files.wordpress.com/2014/11/grumpy-cat-no-1.jpg","no.jpg");
            //     break;
            // case 'nein': mybot.sendFile(message.channel, "http://i.imgur.com/sMQoX48.gif", "nein.gif");
            //     break;
            // case 'rainbow': mybot.sendFile(message.channel, "http://pre12.deviantart.net/4437/th/pre/i/2015/121/6/7/unicorn_pooping_a_rainbow_by_designfarmstudios-d2upaha.png", "rainbow.png");
            //     break;
            case 'save': var params = getParams(message.content, keyword);
                if(params.length < 2) return;
                if(params[0] && typeof params[0] === 'string' && params[0].length > 0 && validUrl.is_uri(params[1])) {
                    if (allowable_extensions.indexOf(params[1].split('.').pop()) == -1) {
                        return;
                    }
                    command.save(params[0], params[1], message.author.id).then(function(){
                        mybot.sendMessage(message.channel, "Saved new command: " + params[0]);
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
                    command.fetch(keyword).then(function(results){
                        var img = {};
                        if(results.length == 0) return;
                        else if(results.length > 1){
                            img = results[Math.floor(Math.random()*results.length)];
                        }else{
                            img = results[0];
                        }
                        mybot.sendFile(message.channel, img.url, "image.gif");
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
