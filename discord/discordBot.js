"use strict";

const Discord = require("discord.js");
const config = require('../config');
const phantomScripts = require('./../phantomScripts');
const log = require('bristol');

const imageRepository = require('./../repositories/imageRepository');
const userRepository = require('./../repositories/userRepository');
const auditRepository = require('./../repositories/auditRepository');
const voteRepository = require('./../repositories/voteRepository');

const commands = require('./commandList');
const bot = new Discord.Client();

let typingTimeout = null;

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
        bot.clearTimeout(typingTimeout);
        log.debug("starting typing");
        message.channel.startTyping();
        let commandPromise = command.run(message, params, keyword);
        Promise.all([userDetailsPromise, commandPromise])
            .then(result => {
                typingTimeout = bot.setTimeout(() => {
                    message.channel.stopTyping();
                    log.debug("stopping typing");
                }, 1000);
                if(!result[1]) return;
                return auditRepository.logCommandAudit(result[0].id, message.channel.id, result[1].id, keyword, params, result[1].__imageId)
            }).catch(err => {
                log.error(err);
            });
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

function setNumberReaction(message, number){
    if(number > 4 || number < 0) throw "unknown number";
    clearOwnReactions(message);
    switch(number){
        case 1: message.react('1⃣');
            break;
        case 2: message.react('2⃣');
            break;
        case 3: message.react('3⃣');
            break;
        case 4: message.react('4⃣');
    }
}

bot.on("messageReactionAdd", (messageReaction, user) => {
    if(!user || !messageReaction){
        return;
    }
    let message = messageReaction.message;
    if(!message.author.equals(bot.user)) return;

    let id = message.id;

    let downvoteReact = messageReaction.emoji.name === "⬇";
    let upvoteReact = messageReaction.emoji.name === "⬆";

    let guildUser = message.guild.members.get(user.id);
    if(messageReaction.emoji.name === "❎") {
        if (!guildUser || !guildUser.hasPermission("ADMINISTRATOR")) return;
        log.info("admin attempting to delete an image", message.author.username);
        return auditRepository.findImageByMessageId(id).then(image => {
            if (image) {
                return imageRepository.delete(image.id).then(() => message.delete())
            }
        });
    }

    if(downvoteReact || upvoteReact){
        if(!guildUser || guildUser.roles.size == 0) return;
        return auditRepository.findImageByMessageId(id).then(image => {
            if (image) {
                return userRepository.fetchByDiscordId(user.id).then(user => {
                    if (user) {
                        let votePromise;
                        if(downvoteReact){
                            votePromise = voteRepository.downvote(image.id, user.id)
                        }else{
                            votePromise = voteRepository.upvote(image.id, user.id)
                        }
                        return votePromise.then(added => {
                            if (added) {
                                return voteRepository.getVotes(image.id).then(votes => {
                                    let totalDownvotes = 0;
                                    votes.forEach(vote => {
                                        if(vote.is_upvote){
                                            totalDownvotes--;
                                        }else if(!vote.is_upvote){
                                            totalDownvotes++;
                                        }
                                    });
                                    if (totalDownvotes > 4) {
                                        return imageRepository.delete(image.id).then((count) => {
                                            if (count) {
                                                return message.channel.sendMessage("Deleted image for command " + image.command + " due to downvotes.").then(() => message.delete());
                                                //todo: also delete any other instance of the image in the current cache
                                            }
                                        });
                                    }else if(totalDownvotes > 0){
                                        setNumberReaction(message, totalDownvotes);
                                    }else{
                                        clearOwnReactions(message);
                                    }
                                })
                            }
                        })

                    }
                })
            }
        })
    }
});

bot.on("disconnect", (closeEvent)=> {
    log.info("Bot disconnected", closeEvent);
});

bot.login(config.discordToken).catch(error => log.error(error));

let getParams = function(messageString, command) {
    let words = messageString.split(' ');
    let commandIndex = words.map(word=>word.toLowerCase()).indexOf('!'+command.toLowerCase());
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