var Discord = require("discord.js");
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var phantomScripts = require('./phantomScripts');
const log = require('better-logs')('discord');
var validUrl = require('valid-url');
var rp = require('request-promise');

var MAX_SIZE = 5000000;

var bot = new Discord.Client();
var commandRepository = require('./repositories/commandRepository');
var userRepository = require('./repositories/userRepository');
var auditRepository = require('./repositories/auditRepository');
var allowable_extensions = ['jpeg','jpg','png','gif'];
var humanizeDuration = require('humanize-duration');

var parseDuration = require('parse-duration');

bot.on("message", (message) => {
    //increment message count
    logUserDetails(message.author).then(user => {
        auditRepository.logMessageAudit(user.id, message.channel.id, message.author.equals(bot.user)).catch(error => log.error(error));
    });
    if(message.mentions.length > 0) return;
    if(message.author.equals(bot.user)) return;
    var matches = message.content.match(/!(\w+)/);
    if(matches && matches.length == 2){
        var keyword= matches[1];
        var params = getParams(message.content, keyword);
        var commandParam;
        switch(keyword){
            case 'sheet':
                if(config.sheetUrl) {
                    bot.reply(message, "<" + config.sheetUrl + ">");
                }
                break;
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
                bot.reply(message, "you rolled " + Math.ceil(Math.random() * 6) + " (1 - " + 6 + ")").catch(error => log.error(error));
                break;
            case 'audit':
                runAudit(message);
                log.info('Audit message');
                break;
            case 'spammers':
                var duration = parseDuration(params.join(' '));
                if(params.filter(param => param.toLowerCase() === 'all').length > 0 && message.server){
                    auditRepository.top10UsersForServerByMessageCountWithDuplicateDetection(message.server.channels.map(channel => channel.id), duration).then(result => {
                        if (result && result.length > 0) {
                            var opMessage = `Top 10 most active users in the server #${message.server.name} for `;
                            opMessage += duration > 0 ? ("the last " + humanizeDuration(duration) + ":\n") : "all time:\n";
                            result.forEach(messageCount => opMessage += "\n" + messageCount.username + ": " + messageCount.count);
                            return bot.sendMessage(message.channel, opMessage);
                        } else if (result.length == 0) {
                            return bot.sendMessage(message.channel, "No eligible messages found.");
                        }
                    }).catch(error => log.error(error));
                } else {
                    auditRepository.top10UsersForChannelByMessageCountWithDuplicateDetection(message.channel.id, duration).then(result => {
                        if (result && result.length > 0) {
                            var opMessage = `Top 10 most active users in the channel #${message.channel.name} for `;
                            opMessage += duration > 0 ? ("the last " + humanizeDuration(duration) + ":\n") : "all time:\n";
                            result.forEach(messageCount => opMessage += "\n" + messageCount.username + ": " + messageCount.count);
                            return bot.sendMessage(message.channel, opMessage);
                        } else if (result.length == 0) {
                            return bot.sendMessage(message.channel, "No eligible messages found.");
                        }
                    }).catch(error => log.error(error));
                }
                break;
            case 'random':
                commandRepository
                    .random()
                    .then(img => {
                        log.info("fetched random filename: "+img.url);
                        get_fileSize(img.url, err => {
                            if(err){
                                return bot.reply(message, "Image is too large :(").catch(error => log.error(error));
                            }else{
                                return bot.sendFile(message.channel, img.url, "image." + img.url.split('.').pop(), "Here's your random image: !" + img.command);
                            }
                        });
                    })
                    .catch(err => log.error(err));

                break;
            case 'list':
                if(params.length < 1) return;
                commandParam = params[0].toLowerCase();
                if(commandParam && typeof commandParam === 'string' && commandParam.length > 0){
                    commandRepository
                        .fetch(commandParam.toLowerCase())
                        .then(results => {
                            log.info("fetched list of "+ results.length +" values for " + commandParam);
                            if (results.length == 0) return;
                            var opMessage = "Saved images for command "+commandParam+":\n";
                            var count = 1;
                            results.forEach(img => {
                                opMessage += "\n" + count + ": <" + img.url + "> [" + img.uploader + "]";
                                count++;
                            });
                            return bot.sendMessage(message.channel, opMessage);
                        }).catch(error => log.error(error));
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
                    // if(commandParam === "red" || commandParam === "redlorr"){
                    //     return;
                    // }
                    //todo add duplicate discarding
                    get_fileSize(uriParam, err => {
                        if(err){
                            bot.reply(message, "Image is too large :(");
                        }else{
                            commandRepository
                                .save(commandParam, uriParam, message.author.id)
                                .then(() => bot.reply(message, "new command: " + commandParam + " has been added successfully."))
                                .catch(err => log.info(err));
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
                            log.info("fetched " + keyword.toLowerCase() + ", filename: "+img.url);
                            get_fileSize(img.url, err => {
                                if(err){
                                    return bot.reply(message, "Image is too large :(").catch(error => log.error(error));
                                }else{
                                    return bot.sendFile(message.channel, img.url, "image." + img.url.split('.').pop());
                                }
                            });
                        })
                        .catch(err => log.error(err));
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
    log.info("getting params");
    var words = messageString.split(' ');
    log.info("words:",words);
    var commandIndex = words.indexOf('!'+command);
    if (commandIndex == (words.length - 1) || commandIndex < 0) {
        return [];
    }
    var results = [];
    for (var i = commandIndex + 1; i < words.length; i++) {
        results.push(words[i]);
    }
    log.info(results);
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
    }).catch(error => log.error(error));
}

bot.on("ready", () => {
    log.info("Bot started up!");
    bot.users.forEach((discordUser) => {
        logUserDetails(discordUser);
    })
});

bot.on("serverNewMember", (server, discordUser) => {
    log.info("Saving details on new member", discordUser.username);
    logUserDetails(discordUser);
});

bot.on("presence", (oldUser, discordUser) => {
    log.info("Member presence updated!", discordUser.username);
    logUserDetails(discordUser);
});

var runAudit = function(message){
    bot.sendMessage(message.channel, 'One second...');

    phantomScripts.readAudit().then(auditInfo => {
        log.info("Audit promise returned");
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
        log.info(opString);
        bot.sendMessage(message.channel, opString);
    });
};

exports.newAppMessage = function(title,url){
    bot.sendMessage(bot.channels.get("name","guild"),"New Application Posted: "+ title + " " + url);
};
