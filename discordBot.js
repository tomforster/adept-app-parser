var Discord = require("discord.js");
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var phantomScripts = require('./phantomScripts');
var logger = require("./logger");
var validUrl = require('valid-url');
var rp = require('request-promise');

var MAX_SIZE = 5000000;

var bot = new Discord.Client();
var commandRepository = require('./repositories/commandRepository');
var userRepository = require('./repositories/userRepository');
var userMessageCountRepository = require('./repositories/userMessageCountRepository');
var auditRepository = require('./repositories/auditRepository');
var allowable_extensions = ['jpeg','jpg','png','gif'];
var moment = require('moment');

var parseDuration = require('parse-duration');

var lastMessageUserId = "";

bot.on("message", (message) => {
    //increment message count
    logUserDetails(message.author).then(user => {
        if(lastMessageUserId !== user.id) {
            userMessageCountRepository.increment(user.id).catch(error => logger.error(error));
        }
        lastMessageUserId = user.id;

        auditRepository.logMessageAudit(user.id, message.channel.id, message.author.equals(bot.user)).catch(error => logger.error(error));
    });
    if(message.mentions.length > 0) return;
    if(message.author.equals(bot.user)) return;
    var matches = message.content.match(/!(\w+)/);
    if(matches && matches.length == 2){
        var keyword= matches[1];
        var params = getParams(message.content, keyword);
        var commandParam;
        switch(keyword){
            case 'roll' :
                if(params.length > 0){
                    if(!isNaN(params[0])){
                        var upperBound = +params[0];
                        //is this an int
                        if(upperBound % 1 === 0 && upperBound < Number.MAX_VALUE && upperBound > 0){
                            bot.reply(message, "you rolled " + Math.ceil(Math.random() * upperBound) + " (1 - " + upperBound + ")");
                            return;
                        }
                    }
                }
                bot.reply(message, "you rolled " + Math.ceil(Math.random() * 6) + " (1 - " + 6 + ")").catch(error => logger.error(error));
                break;
            case 'audit':
                runAudit(message);
                logger.info('Audit message');
                break;
            case 'spammers':
                userMessageCountRepository.fetchTop10().then(result => {
                    if(result && result.length > 0){
                        var opMessage = "Top 10 most active Discord users (by messages sent):\n";
                        result.forEach(messageCount => opMessage += "\n" + messageCount.username + ": " + messageCount.count);
                        return bot.sendMessage(message.channel, opMessage);
                    }
                }).catch(error => logger.error(error));
                break;
            case 'spammers_beta':
                var duration = parseDuration(params.join(' '));
                if(duration > 0) {
                    var start = moment().subtract(duration, 'milliseconds');
                    logger.info("duration test string:", parseDuration(params.join(' ')), moment().from(start, true));
                }
                auditRepository.top10UsersForChannelByMessageCountWithDuplicateDetection(message.channel.id).then(result => {
                    if(result && result.length > 0){
                        var opMessage = `Top 10 most active users in the channel #${message.channel.name} for all time:\n`;
                        result.forEach(messageCount => opMessage += "\n" + messageCount.username + ": " + messageCount.count);
                        return bot.sendMessage(message.channel, opMessage);
                    }
                }).catch(error => logger.error(error));
                break;
            case 'random':
                commandRepository
                    .random()
                    .then(img => {
                        logger.info("fetched random filename: "+img.url);
                        get_fileSize(img.url, err => {
                            if(err){
                                return bot.reply(message, "Image is too large :(").catch(error => logger.error(error));
                            }else{
                                return bot.sendFile(message.channel, img.url, "image." + img.url.split('.').pop(), "Here's your random image: !" + img.command);
                            }
                        });
                    })
                    .catch(err => logger.error(err));

                break;
            case 'list':
                if(params.length < 1) return;
                commandParam = params[0].toLowerCase();
                if(commandParam && typeof commandParam === 'string' && commandParam.length > 0){
                    commandRepository
                        .fetch(commandParam.toLowerCase())
                        .then(results => {
                            logger.info("fetched list of "+ results.length +" values for " + commandParam);
                            if (results.length == 0) return;
                            var opMessage = "Saved images for command "+commandParam+":\n";
                            var count = 1;
                            results.forEach(img => {
                                opMessage += "\n" + count + ": <" + img.url + ">";
                                count++;
                            });
                            return bot.sendMessage(message.channel, opMessage);
                        }).catch(error => logger.error(error));
                }
                break;
            case 'save':
                if(params.length < 2) return;
                commandParam = params[0].toLowerCase();
                var uriParam = params[1];
                if(commandParam && typeof commandParam === 'string' && commandParam.length > 0 && validUrl.is_uri(uriParam)) {
                    if(commandParam.indexOf('!') >= 0){
                        bot.reply(message, "command: " + commandParam + " should not contain exclamation marks.");
                        return;
                    }
                    if (allowable_extensions.indexOf(uriParam.split('.').pop().toLowerCase()) == -1) {
                        bot.reply(message, "command: " + commandParam + " has an unknown extension.");
                        return;
                    }
                    if(commandParam === "red" || commandParam === "redlorr"){
                        return;
                    }
                    //todo add duplicate discarding
                    get_fileSize(uriParam, err => {
                        if(err){
                            bot.reply(message, "Image is too large :(");
                        }else{
                            commandRepository
                                .save(commandParam, uriParam, message.author.id)
                                .then(() => bot.reply(message, "new command: " + commandParam + " has been added successfully."))
                                .catch(err => logger.info(err));
                        }
                    });
                }
                else{
                    return;
                }
                break;
            default:
                if(keyword && typeof keyword === 'string' && keyword.length > 0){
                    commandRepository
                        .fetch(keyword.toLowerCase())
                        .then(results => {
                            var img = {};
                            if(results.length == 0) return;
                            else if(results.length > 1){
                                img = results[Math.floor(Math.random()*results.length)];
                            }else{
                                img = results[0];
                            }
                            logger.info("fetched " + keyword.toLowerCase() + ", filename: "+img.url);
                            get_fileSize(img.url, err => {
                                if(err){
                                    return bot.reply(message, "Image is too large :(").catch(error => logger.error(error));
                                }else{
                                    return bot.sendFile(message.channel, img.url, "image." + img.url.split('.').pop());
                                }
                            });
                        })
                        .catch(err => logger.error(err));
                }
        }
    }
});

//todo convert to promise
function get_fileSize(url, callback) {
    rp({
        url: url,
        method: "HEAD"
    }).then(headRes => {
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
    bot.login(config.discordEmail, config.discordPassword)
        .catch(error => setTimeout(login, 30 * 1000));
};

login();

bot.on("disconnected", login);

function logUserDetails(discordUser){
    //is this user currently in the db?
    return userRepository.fetchByDiscordId(discordUser.id).then(user => {
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
    }).catch(error => logger.error(error));
}

bot.on("ready", () => {
    logger.info("Bot started up!");
    bot.users.forEach((discordUser) => {
        logUserDetails(discordUser);
    })
});

bot.on("serverNewMember", (server, discordUser) => {
    logger.info("Saving details on new member", discordUser.username);
    logUserDetails(discordUser);
});

bot.on("presence", (oldUser, discordUser) => {
    logger.info("Member presence updated!", discordUser.username);
    logUserDetails(discordUser);
});

var runAudit = function(message){
    bot.sendMessage(message.channel, 'One second...');

    phantomScripts.readAudit().then(auditInfo => {
        logger.info("Audit promise returned");
        var bads = auditInfo.characterData.filter(player => player.audit !== '0' || player.upgrades !== '100');
        var opString = "";
        bads.forEach(bad => {
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
        bot.sendMessage(message.channel, opString);
    });
};

exports.newAppMessage = function(title,url){
    bot.sendMessage(bot.channels.get("name","guild"),"New Application Posted: "+ title + " " + url);
};
