"use strict";

const Discord = require("discord.js");
const config = require('../config');
const log = require("bristol");

const imageRepository = require('../repositories/imageRepository');
const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');
const voteRepository = require('../repositories/voteRepository');
const pollRepository = require('../repositories/pollRepository');

const utils = require('./utils');

const commands = require('./commandList');
const bot = new Discord.Client();
const humanizeDuration = require('humanize-duration');

bot.on("message", (message) => {

    //increment message count
    let userDetailsPromise = logUserDetails(message.author);

    userDetailsPromise
        .then(user => auditRepository.logMessageAudit(user.id, message.channel.id, message.author.equals(bot.user)))
        .catch(err => log.error(err));

    if(message.author.equals(bot.user) || message.author.bot) return;

    let matches = message.cleanContent.match(/!([\uD83C-\uDBFF\uDC00-\uDFFF\w]+)/);
    if(matches && matches.length === 2){
        let keyword= matches[1].toLowerCase(); //keyword without bang
        if(keyword.length > 50){
            log.warn("command:", keyword, "too long");
            return
        }
        log.info("Detected command:", keyword);
        let params = utils.getParams(message.content, keyword);
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

        log.info("running command, user, id", keyword, message.author.username, message.author.id);
        message.channel.startTyping();
        userDetailsPromise.then(user => {
            return command.run(message, params, keyword, user)
                .then(result => {
                    message.channel.stopTyping();
                    if(!result) return;
                    return auditRepository.logCommandAudit(user.id, message.channel.id, result.id, keyword, params, result.__imageId)
                }).catch(err => {
                    message.channel.stopTyping();
                    log.error(err);
                });
        });
    }

});

bot.on("ready", () => {
    log.info("Bot started up!");
    bot.users.forEach(discordUser => logUserDetails(discordUser).catch(log.error));
    // bot.user.setAvatar(path.join(__dirname, "avatar.jpg"))
    //     .catch();
    auditRepository.getRecentImageMessageAudits()
        .then(audits => {
            let messagesPromises = [];
            audits.forEach( audit => {
                if (bot.channels.has(audit.channel_id)) {
                    messagesPromises.push(bot.channels.get(audit.channel_id).fetchMessage(audit.message_reply_id).catch(() => Promise.resolve()));
                }
            });
            return Promise.all(messagesPromises).then(messages => messages.filter(message => !!message));
        })
        .catch(log.error);
});

bot.on("serverNewMember", (server, discordUser) => {
    log.info("Saving details on new member", discordUser.username);
    logUserDetails(discordUser)
        .catch(log.error);
});

bot.on("presence", (oldUser, discordUser) => {
    log.info("Member presence updated!", discordUser.username);
    logUserDetails(discordUser)
        .catch(log.error);
});

bot.on("messageReactionAdd", reactionChange);
bot.on("messageReactionRemove", (messageReaction, user) => reactionChange(messageReaction, user, true));

async function reactionChange(messageReaction, user, isRemove){
    if(!user || !messageReaction){
        return;
    }

    let message = messageReaction.message;
    if(!message.author.equals(bot.user)) return;
    if(user.equals(bot.user)) return;

    let guildUser = message.guild && message.guild.members.get(user.id);
    if(!guildUser || guildUser.roles.size === 0) return;

    let isDownvoteReact = messageReaction.emoji.name === "⬇";
    let isUpvoteReact = messageReaction.emoji.name === "⬆";

    let pollVoteReact = utils.numberEmojis.indexOf(messageReaction.emoji.name) > -1;

    if(isDownvoteReact || isUpvoteReact){
        return auditRepository.findImageByMessageId(message.id)
            .then(image => {
                if (image)
                {
                    return userRepository.fetchByDiscordId(user.id)
                        .then(user => {
                            if (user)
                            {
                                if(isRemove)
                                {
                                    return isDownvoteReact ?
                                        voteRepository.deleteDownvote(image.id, user.id) :
                                        voteRepository.deleteUpvote(image.id, user.id);
                                }
                                else
                                {
                                    return isDownvoteReact ?
                                        voteRepository.downvote(image.id, user.id) :
                                        voteRepository.upvote(image.id, user.id);
                                }
                            }
                            throw `Discord user not found for id ${user.id}`;
                        })
                        .then(changed => {
                            if(changed)
                            {
                                return updateVotesForImage(image, message.channel);
                            }
                            return Promise.resolve();
                        })
                }
                throw `Image not found for message ${message.id}`;
            })
            .catch(log.error);
    }
    else if(pollVoteReact)
    {
        const poll = await auditRepository.findPollByMessageId(message.id);
        const option = numberEmojis.indexOf(messageReaction.emoji.name);
        if(poll){
            const user = await userRepository.fetchByDiscordId(user.id);
            if(user){
                let changed;
                if(isRemove)
                {
                    changed = await pollRepository.removeVotePoll(poll.id, user.id, option);
                }
                else
                {
                    changed = await pollRepository.votePoll(poll.id, user.id, option);

                }

                if(changed)
                {
                    return updateVotesForPoll(poll, message.channel);
                }
                return;
            }
            throw "User not found";
        }
        throw "poll not found";
    }
    else if(!isRemove && messageReaction.emoji.name === "❎")
    {
        log.info("user attempting to delete an image", message.author.username);
        //todo: delete all current instances
        return auditRepository.findImageByMessageId(message.id).then(image => {
            if (image) {
                if (!guildUser || !guildUser.id) return;
                if(guildUser.hasPermission("ADMINISTRATOR") || guildUser.id === image.discord_id){
                    return imageRepository.delete(image.id).then(() => message.delete())
                }
            }
        }).catch(log.error);
    }
}

bot.login(config.discordToken).catch(log.error);

async function updateVotesForPoll(poll){
    const votes = await pollRepository.getPollVotes(poll.id);
    //get message
    const messages = await getMessagesForImage(poll);

    let editPromises = [];
    messages.forEach(message => {
        editPromises.push(message.edit(utils.getImageCommentString(votes, image)));
    });
    return Promise.all(editPromises);
}

function updateVotesForImage(image, channel){
    return voteRepository.getVotes(image.id).then(votes => {
        let dv = 0, uv = 0;
        if(votes && votes.length > 0) {
            dv = votes.filter(vote => !vote.is_upvote).length;
            uv = votes.filter(vote => vote.is_upvote).length;
        }
        if (uv-dv <= -20) {
            return imageRepository.delete(image.id).then((count) => {
                if (count) {
                    return getMessagesForImage(image)
                        .then(messages => {
                            let deletionPromises = [];
                            messages.forEach(message => {
                                deletionPromises.push(message.delete());
                            });
                            return Promise.all(deletionPromises);
                        })
                        .then(() => channel.sendMessage("Deleted image for command " + image.command + " due to downvotes."));
                }
            });
        }
        return getMessagesForImage(image)
            .then(messages => {
                let editPromises = [];
                messages.forEach(message => {
                    editPromises.push(message.edit(utils.getImageCommentString(votes, image)));
                });
                return Promise.all(editPromises);
            });
    })
}

async function getMessagesForImage(image){
    let messagesPromises = [];
    image.messages.forEach( (messageId, i) => {
        let messageChannelId = image.message_channels[i];
        if (bot.channels.has(messageChannelId)) {
            messagesPromises.push(bot.channels.get(messageChannelId).fetchMessage(messageId).catch(() => Promise.resolve()));
        }
    });
    return Promise.all(messagesPromises)
        .then(messages => messages.filter(message => !!message));
}

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
    })
}

module.exports.newAppMessage = function(title,url){
    let adeptGuild = bot.guilds.find("name", "Adept");
    if(adeptGuild){
        let guildChannel = adeptGuild.channels.find("name", "guild");
        if(guildChannel){
            return guildChannel.sendMessage("New Application Posted: "+ title + " " + url);
        }
    }
};

module.exports.newLegendaryMessage = function(name, legendary){
    let output, duration = new Date().getTime() - legendary.timestamp;
    if(duration < 1000*60*10){//last 10 minutes
        output = `${name} just looted [${legendary.name}]!`;
    }else{
        let durationString = humanizeDuration(duration, { largest: 1 });
        output = `${name} looted [${legendary.name}] ${durationString} ago!`;
    }

    log.info(output);
    let adeptGuild = bot.guilds.find("name", "Adept");
    if(adeptGuild){
        let guildChannel = adeptGuild.channels.find("name", "guild");
        if(guildChannel){
            if(legendary.id === 132452){
                return guildChannel.sendFile("```css\n" + output + "```", {files:[{attachment:"https://media.giphy.com/media/joXaEWqp3HWbS/giphy.gif", name:"image.gif"}]});
            }
            return guildChannel.sendMessage("```css\n" + output + "```");
        }
    }
};

module.exports.commands = commands;