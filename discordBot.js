var Discord = require("discord.js");
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var phantomScripts = require('./phantomScripts');
var winston = require('winston');
var validUrl = require('valid-url');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':true})
    ]
});
var rp = require('request-promise');

var MAX_SIZE = 5000000;

var mybot = new Discord.Client();
var commandRepository = require('./repositories/commandRepository');
var userRepository = require('./repositories/userRepository');
var userMessageCountRepository = require('./repositories/userMessageCountRepository');
var allowable_extensions = ['jpeg','jpg','png','gif'];

var lastMessageUserId = "";

mybot.on("message", function(message){
    //increment message count
    logUserDetails(message.author).then(function(user){
        if(lastMessageUserId !== user.id) {
            userMessageCountRepository.increment(user.id).catch(function (error) {
                logger.error(error);
            });
        }
        lastMessageUserId = user.id;
    });
    if(message.mentions.length > 0) return;
    var matches = message.content.match(/!(\w+)/);
    if(matches && matches.length == 2){
        var keyword= matches[1];
        var params = getParams(message.content, keyword);
        switch(keyword){
            case 'roll' :
                if(params.length > 0){
                    if(!isNaN(params[0])){
                        var upperBound = +params[0];
                        //is this an int
                        if(upperBound % 1 === 0 && upperBound < Number.MAX_VALUE && upperBound > 0){
                            mybot.reply(message, "you rolled " + Math.ceil(Math.random() * upperBound) + " (1 - " + upperBound + ")");
                            return;
                        }
                    }
                }
                mybot.reply(message, "you rolled " + Math.ceil(Math.random() * 6) + " (1 - " + 6 + ")").catch(function(error){
                    logger.error(error);
                });
                break;
            case 'audit':
                runAudit(message);
                logger.info('Audit message');
                break;
            case 'spammers':
                userMessageCountRepository.fetchTop10().then(function(result){
                    if(result && result.length > 0){
                        var opMessage = "Top 10 most active Discord users (by messages sent):\n";
                        result.forEach(function(messageCount){
                            opMessage += "\n" + messageCount.username + ": " + messageCount.count;
                        });
                        mybot.sendMessage(message.channel, opMessage).catch(function(error){
                            logger.error(error);
                        });
                    }
                });
                break;
            case 'list':
                if(params.length < 2) return;
                var commandParam = params[0].toLowerCase();
                if(commandParam && typeof commandParam === 'string' && commandParam.length > 0){
                    commandRepository.fetch(keyword.toLowerCase()).then(function(results) {
                        logger.info("fetched list of "+ results.length +" values for " + commandParam);
                        if (results.length == 0) return;
                        var opMessage = "Saved images for command "+commandParam+":\n";
                        results.forEach(function(img){
                            opMessage += "\n" + img.url;
                        });
                        mybot.sendMessage(message.channel, opMessage).catch(function(error){
                            logger.error(error);
                        });
                    });
                }
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
                    get_filesize(uriParam, function(err){
                        if(err){
                            mybot.reply(message, "Image is too large :(");
                        }else{
                            commandRepository.save(commandParam, uriParam, message.author.id).then(function(){
                                return mybot.reply(message, "new command: " + commandParam + " has been added successfully.");
                            }).catch(function(err){
                                logger.info(err);
                            });
                        }
                    });
                }
                else{
                    return;
                }
                break;
            default:
                if(keyword && typeof keyword === 'string' && keyword.length > 0){
                    commandRepository.fetch(keyword.toLowerCase()).then(function(results){
                        var img = {};
                        if(results.length == 0) return;
                        else if(results.length > 1){
                            img = results[Math.floor(Math.random()*results.length)];
                        }else{
                            img = results[0];
                        }
                        logger.info("fetched " + keyword.toLowerCase() + ", filename: "+img.url);
                        get_filesize(img.url, function(err){
                            if(err){
                                mybot.reply(message, "Image is too large :(").catch(function(error){
                                    logger.error(error);
                                });
                            }else{
                                mybot.sendFile(message.channel, img.url, "image." + img.url.split('.').pop(), function(err, msg) {
                                    if (err) logger.error(err);
                                });
                            }
                        });
                    }, function(err){
                        logger.error(err);
                    })
                }
        }
    }
});

function get_filesize(url, callback) {
    rp({
        url: url,
        method: "HEAD"
    }).then(function(headRes) {
        var size = headRes['content-length'];
        if (size > MAX_SIZE) {
            callback(true);
        } else {
            callback();
        }
    });
}

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

function logUserDetails(discordUser){
    //is this user currently in the db?
    return userRepository.fetchByDiscordId(discordUser.id).then(function(user){
        if(user === null){
            //if not, save their id and current username
            return userRepository.save(discordUser.id, discordUser.username);
        }else{
            //if so, and their username has changed, update it
            if(user.username !== discordUser.username) {
                return userRepository.updateUsername(user.id, discordUser.username);
            }
            return user;
        }
    }).then(function(user){
        return user;
    }).catch(function(error){
        logger.error(error);
    });
}

mybot.on("ready",function() {
    logger.info("Bot started up!");
    mybot.users.forEach(function(discordUser){
        logUserDetails(discordUser);
    })
});

mybot.on("serverNewMember",function(server, discordUser){
    logger.info("Saving details on new member", discordUser.username);
    logUserDetails(discordUser);
});

mybot.on("presence",function(oldUser, discordUser){
    logger.info("Member presence updated!", discordUser.username);
    logUserDetails(discordUser);
});

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
