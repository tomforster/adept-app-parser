"use strict";

const Discord = require("discord.js");
const path = require("path");
const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, '../config/config.json'))[env];
const phantomScripts = require('./../phantomScripts');
const log = require('bristol');

const commandRepository = require('./../repositories/commandRepository');
const userRepository = require('./../repositories/userRepository');
const auditRepository = require('./../repositories/auditRepository');

const commands = require('./commandList');
const bot = new Discord.Client();

bot.on("message", (message) => {

    //increment message count
    let userDetailsPromise = logUserDetails(message.author);

    userDetailsPromise
        .then(user => auditRepository.logMessageAudit(user.id, message.channel.id, message.author.equals(bot.user)))
        .catch(err => log.error(err));

    if(message.author.equals(bot.user) || message.author.bot) return;
    let matches = message.cleanContent.match(/!(\w+)/);
    if(matches && matches.length == 2){
        let keyword= matches[1].toLowerCase(); //keyword without bang
        if(keyword.length > 50){
            log.warn("command:", keyword, "too long");
            return
        }
        log.info("Detected command:", keyword);
        let params = getParams(message.content, keyword);
        if(params.join(',').length > 500){
            log.warn("params list:", params.join(','), "too long");
            return
        }
        log.info("Detected params:", params);

        let command, commandIndex = Object.keys(commands).find(commandKey => commands[commandKey].names.indexOf(keyword) >= 0);
        if(!commandIndex){
            command =  commands.default;
        }else{
            command = commands[commandIndex];
        }

        log.info("running command, user, id",keyword,message.author.username,message.author.id);
        let commandPromise = command.run(message, params, keyword);
        Promise.all([userDetailsPromise, commandPromise])
            .then(result => {
                return auditRepository.logCommandAudit(result[0].id, message.channel.id, result[1] && result[1].id || null, keyword, params, result[1] && result[1].__imageId || null)
            }).catch(err => log.error(err));
    }

});

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

function clearOwnReactions(message){
    return Promise.all(message.reactions.findAll('me', true).map(reaction => reaction.remove(bot.user))).catch(error => log.error(error));
}

bot.on("messageReactionAdd", (messageReaction, user) => {
    if(!user || !messageReaction){
        return;
    }
    let message = messageReaction.message;
    if(!message.author.equals(bot.user)) return;

    let id = message.id;

    let guildUser = message.guild.members.get(user.id);
    if(messageReaction.emoji.name === "❎"){
        if(!guildUser || !guildUser.hasPermission("ADMINISTRATOR")) return;
        log.info("admin attempting to delete an image", message.author.username);
        return auditRepository.findCommandByMessageId(id).then(imageId => {
            if(imageId) {
                return commandRepository.delete(imageId).then(() => message.delete())
            }
        });
    }else if(messageReaction.emoji.name === "⬆"){
        if(!guildUser || guildUser.roles.size == 0) return;
        return auditRepository.findCommandByMessageId(id).then(imageId => {
            if(imageId) {
                return commandRepository.upvote(imageId).then(downvotes => {
                    switch(downvotes){
                        case 0: clearOwnReactions(message);
                            break;
                        case 1:
                            clearOwnReactions(message);
                            message.react('1⃣');
                            break;
                        case 2:
                            clearOwnReactions(message);
                            message.react('2⃣');
                            break;
                        case 3:
                            clearOwnReactions(message);
                            message.react('3⃣');
                            break;
                        case 4:
                            clearOwnReactions(message);
                            message.react('4⃣');
                    }
                })
            }
        });
    }else if(messageReaction.emoji.name === "⬇"){
        if(!guildUser || guildUser.roles.size == 0) return;
        return auditRepository.findCommandByMessageId(id).then(imageId => {
            if(imageId) {
                return commandRepository.downvote(imageId).then(downvotes => {
                    switch(downvotes){
                        case 0: log.error("downvoted from negative or downvote not counted correctly!", imageId);
                            break;
                        case 1:
                            clearOwnReactions(message);
                            message.react('1⃣');
                            break;
                        case 2:
                            clearOwnReactions(message);
                            message.react('2⃣');
                            break;
                        case 3:
                            clearOwnReactions(message);
                            message.react('3⃣');
                            break;
                        case 4:
                            clearOwnReactions(message);
                            message.react('4⃣');
                            break;
                        case 5:
                            return commandRepository.delete(imageId).then((deletedImage) => message.delete()).then(() => message.channel.sendMessage("Deleted image due to downvotes."));
                    }
                })
            }
        });
    }
});

bot.on("disconnect", (closeEvent)=> {
    log.info("Bot disconnected", closeEvent);
});

bot.login(config.discordToken).catch(error => log.error(error));

let getParams = function(messageString, command) {
    let words = messageString.split(' ');
    let commandIndex = words.indexOf('!'+command);
    if (commandIndex == (words.length - 1) || commandIndex < 0) {
        return [];
    }
    let results = [];
    for (let i = commandIndex + 1; i < words.length; i++) {
        results.push(words[i]);
    }
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

module.exports.newAppMessage = function(title,url){
    let adeptGuild = bot.guilds.find("name", "Adept");
    if(adeptGuild){
        let guildChannel = adeptGuild.channels.find("name", "guild");
        if(guildChannel){
            return guildChannel.sendMessage("New Application Posted: "+ title + " " + url);
        }
    }
    return Promise.resolve();
};

module.exports.commands = commands;