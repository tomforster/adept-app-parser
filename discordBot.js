const Discord = require("discord.js");
const path = require("path");
const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, 'config/config.json'))[env];
const phantomScripts = require('./phantomScripts');
const log = require('better-logs')('discord');
const validUrl = require('valid-url');
const rp = require('request-promise');

const commandRepository = require('./repositories/commandRepository');
const userRepository = require('./repositories/userRepository');
const auditRepository = require('./repositories/auditRepository');
const allowable_extensions = ['jpeg', 'jpg', 'png', 'gif'];
const humanizeDuration = require('humanize-duration');
const parseDuration = require('parse-duration');

const MAX_SIZE = 5000000;
const bot = new Discord.Client();

const messageCache = {};

bot.on("message", (message) => {
    //increment message count
    logUserDetails(message.author).then(user => {
        auditRepository.logMessageAudit(user.id, message.channel.id, message.author.equals(bot.user)).catch(error => log.error(error));
    });
    if(message.mentions.length > 0) return;
    if(message.author.equals(bot.user)) return;
    if(message.author.bot) return;
    let matches = message.content.match(/!(\w+)/);
    if(matches && matches.length == 2){
        let keyword= matches[1];
        let params = getParams(message.content, keyword);
        let commandParam;
        switch(keyword) {
            case 'sheet':
                if (config.sheetUrl) {
                    message.reply("<" + config.sheetUrl + ">");
                }
                break;
            case 'roll' :
                if (params.length > 0) {
                    if (!isNaN(params[0])) {
                        let upperBound = +params[0];
                        //is this an int
                        if (upperBound % 1 === 0 && upperBound < Number.MAX_VALUE && upperBound > 0) {
                            message.reply("you rolled " + Math.ceil(Math.random() * upperBound) + " (1 - " + upperBound + ")");
                            return;
                        }
                    }
                }
                message.reply("you rolled " + Math.ceil(Math.random() * 6) + " (1 - " + 6 + ")").catch(error => log.error(error));
                break;
            case 'spammers':
                let duration = parseDuration(params.join(' '));
                if (params.filter(param => param.toLowerCase() === 'all').length > 0 && message.server) {
                    auditRepository.top10UsersForServerByMessageCountWithDuplicateDetection(message.server.channels.map(channel => channel.id), duration).then(result => {
                        if (result && result.length > 0) {
                            let opMessage = `Top 10 most active users in the server #${message.server.name} for `;
                            opMessage += duration > 0 ? ("the last " + humanizeDuration(duration) + ":\n") : "all time:\n";
                            result.forEach(messageCount => opMessage += "\n" + messageCount.username + ": " + messageCount.count);
                            return message.channel.sendMessage(opMessage);
                        } else if (result.length == 0) {
                            return message.channel.sendMessage("No eligible messages found.");
                        }
                    }).catch(error => log.error(error));
                } else {
                    auditRepository.top10UsersForChannelByMessageCountWithDuplicateDetection(message.channel.id, duration).then(result => {
                        if (result && result.length > 0) {
                            let opMessage = `Top 10 most active users in the channel #${message.channel.name} for `;
                            opMessage += duration > 0 ? ("the last " + humanizeDuration(duration) + ":\n") : "all time:\n";
                            result.forEach(messageCount => opMessage += "\n" + messageCount.username + ": " + messageCount.count);
                            return message.channel.sendMessage(opMessage);
                        } else if (result.length == 0) {
                            return message.channel.sendMessage("No eligible messages found.");
                        }
                    }).catch(error => log.error(error));
                }
                break;
            case 'random':
                message.react("✅");
                return getImage().then(img =>
                    sendImage(message, img, "Here's your random image: !" + img.command)
                );
            case 'list': {
                if (params.length < 1) return;
                commandParam = params[0].toLowerCase();
                if (commandParam && typeof commandParam === 'string' && commandParam.length > 0) {
                    commandRepository
                        .fetchAll(commandParam.toLowerCase())
                        .then(results => {
                            log.info("fetched list of " + results.length + " values for " + commandParam);
                            if (!results || results.length == 0) return;
                            let opMessage = "Saved images for command " + commandParam + ":\n";
                            let count = 1;
                            results.forEach(img => {
                                opMessage += "\n" + count + ": <" + img.url + "> (" + img.id + ") [" + img.uploader + "]";
                                count++;
                            });
                            return message.channel.sendMessage(opMessage);
                        }).catch(error => log.error(error));
                }
                break;
            }
            case 'save': {
                if (params.length < 2) return;
                commandParam = params[0].toLowerCase();
                let uriParam = params[1];
                if (commandParam && typeof commandParam === 'string' && commandParam.length > 0 && validUrl.is_uri(uriParam)) {
                    if (commandParam.indexOf('!') >= 0) {
                        return message.reply("command: " + commandParam + " should not contain exclamation marks.");
                    }
                    if (allowable_extensions.indexOf(uriParam.split('.').pop().toLowerCase()) == -1) {
                        return message.reply("command: " + commandParam + " has an unknown extension.");
                    }
                    // if(commandParam === "red" || commandParam === "redlorr"){
                    //     return;
                    // }
                    //todo add duplicate discarding
                    get_fileSize(uriParam, err => {
                        if (err) {
                            return message.reply("Image is too large :(");
                        } else {
                            return commandRepository
                                .save(commandParam, uriParam, message.author.id)
                                .then(() => message.reply("new command: " + commandParam + " has been added successfully."))
                                .catch(err => log.info(err));
                        }
                    });
                }
                else {
                    return;
                }
                break;
            }
            case "delete":
                if (params.length < 2) return;
                commandParam = params[0].toLowerCase();
                let idParam = params[1];
                if (commandParam && typeof commandParam === 'string' && commandParam.length > 1 && idParam && !isNaN(idParam)) {
                    if(commandParam.charAt(0) === '!')
                        commandParam = commandParam.slice(1);
                    let guildUser = message.guild.members.get(message.author.id);
                    if(!guildUser || !guildUser.hasPermission("ADMINISTRATOR")) return;
                    message.react("✅");
                    return commandRepository.safeDelete(commandParam, idParam).then(() => {
                        return message.reply("successfully deleted image for command " + commandParam +".");
                    }).catch(error => {
                        return message.reply("failed to deleted image for command " + commandParam +".");
                    });


                }
                break;
            default:
                if(keyword && typeof keyword === 'string' && keyword.length > 0){
                    return getImage(keyword.toLowerCase()).then(img => {
                        message.react("✅");
                        return sendImage(message, img)
                    });
                }
        }
    }
});

function getImage(command){
    return commandRepository.random(command).then(img => {
        if(!img) return;
        log.info("fetched " + img.command.toLowerCase() + ", filename: "+img.url);
        return get_fileSize(img.url).then(result => {
            if(result){
                return img;
            }else{
                throw "Image is too large :(";
            }
        }).catch(() => {
            return commandRepository.delete(img.id).then(() => {
                throw 404
            });
        });
    }).catch(err => {
        log.error(err);
        if(err === 404){
            return getImage(command)
        }
        throw "Unknown image";
    });
}

function sendImage(message, img, text){
    return message.channel.sendFile(img.url, "image." + img.url.split('.').pop(), text).then(result => {
        addToMessageCache(result, img);
        return result;
    });
}

function addToMessageCache(message, img){
    if(Object.keys(messageCache).length > 1000){
        Object.keys(messageCache).sort((key1, key2) => messageCache[key1].time - messageCache[key2].time).slice(500).forEach(key => delete messageCache[key]);
    }
    messageCache[message.id] = {img:img, time:new Date().getTime()};
}

function get_fileSize(url) {
    return rp({
        url: url,
        method: "HEAD"
    }).then(headRes => {
        let size = headRes['content-length'];
        return size <= MAX_SIZE;
    });
}

let getParams = function(messageString, command) {
    log.info("getting params");
    let words = messageString.split(' ');
    log.info("words:",words);
    let commandIndex = words.indexOf('!'+command);
    if (commandIndex == (words.length - 1) || commandIndex < 0) {
        return [];
    }
    let results = [];
    for (let i = commandIndex + 1; i < words.length; i++) {
        results.push(words[i]);
    }
    log.info(results);
    return results;
};

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
    });
    bot.user.setAvatar("./avatar.jpg").catch(error => console.log(error));
});

bot.on("serverNewMember", (server, discordUser) => {
    log.info("Saving details on new member", discordUser.username);
    logUserDetails(discordUser);
});

bot.on("presence", (oldUser, discordUser) => {
    log.info("Member presence updated!", discordUser.username);
    logUserDetails(discordUser);
});

bot.on("messageReactionAdd", (messageReaction, user) => {
    if(!user || !messageReaction){
        return;
    }
    let message = messageReaction.message;
    if(!message.author.equals(bot.user)) return;

    let guildUser = message.guild.members.get(user.id);
    if(!guildUser || !guildUser.hasPermission("ADMINISTRATOR")) return;
    if(messageReaction.emoji.name === "❎"){
        let id = message.id;
        if(messageCache.hasOwnProperty(id)){
            let img = (messageCache[id].img);
            commandRepository.delete(img.id).then(() => {
                message.channel.sendMessage("Deleted image for command "+ (img.command));
                message.delete();
                delete messageCache[id];
            });
        }
        else{
            messageReaction.message.channel.sendMessage("Cannot delete image, too much time has passed or I restarted recently :(")
        }
    }
});

exports.newAppMessage = function(title,url){
    let adeptGuild = bot.guilds.find("name", "Adept");
    if(adeptGuild){
        let guildChannel = adeptGuild.channels.find("name", "guild");
        if(guildChannel){
            guildChannel.sendMessage("New Application Posted: "+ title + " " + url);
        }
    }
};

bot.login(config.discordToken).catch(error => log.error(error));