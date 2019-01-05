"use strict";

const config = require('../config');
const log = require("bristol");

const imageRepository = require('../repositories/imageRepository');
const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');
const voteRepository = require('../repositories/voteRepository');

const utils = require('./utils');

const commands = require('./commandList');
const bot = require('./bot');
const humanizeDuration = require('humanize-duration');

bot.on("message", message => {

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
                    return auditRepository.logCommandAudit(user.id, message.channel.id, result.id, keyword, params, result.__imageId, result.__pollId)
                }).catch(err => {
                    message.channel.stopTyping();
                    log.error(err);
                });
        }).catch(err =>
        {
            return command.run(message, params, keyword, null)
                .then(result => {
                    message.channel.stopTyping();
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

async function reactionChange(messageReaction, discordUser, isRemove){
    if(!discordUser || !messageReaction){
        return;
    }

    let message = messageReaction.message;
    if(!message.author.equals(bot.user)) return;
    if(discordUser.equals(bot.user)) return;

    let guildUser = message.guild && message.guild.members.get(discordUser.id);
    if(!guildUser || guildUser.roles.size === 0) return;

    const emoji = messageReaction.emoji.name;

    let isDownvoteReact =emoji === "⬇";
    let isUpvoteReact = emoji === "⬆";

    if(isDownvoteReact || isUpvoteReact){
        return auditRepository.findImageByMessageId(message.id)
            .then(image => {
                if (image)
                {
                    return userRepository.fetchByDiscordId(discordUser.id)
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
    else if(!isRemove && emoji === "❎")
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
    }else{
        let command, commandIndex = Object.keys(commands).find(commandKey => {
            return commands[commandKey].reactions && commands[commandKey].onReact && commands[commandKey].reactions.indexOf(emoji) >= 0
        });
        if(!commandIndex){
            return;
        }else{
            command = commands[commandIndex];
        }
        const user = await userRepository.fetchByDiscordId(discordUser.id);
        if(!user) throw `user not found for id ${discordUser.id}`;
        command.onReact(messageReaction, user, isRemove);
    }
}

bot.login(config.discordToken).catch(log.error);

async function updateVotesForImage(image, channel){
    const votes = await voteRepository.getVotes(image.id)
    let dv = 0, uv = 0;
    if (votes && votes.length > 0) {
        dv = votes.filter(vote => !vote.is_upvote).length;
        uv = votes.filter(vote => vote.is_upvote).length;
    }
    if (uv - dv <= -20) {
        const count = await imageRepository.delete(image.id);
        if (count) {
            const messages = await getMessagesForEntity(image)
            let deletionPromises = [];
            messages.forEach(message => {
                deletionPromises.push(message.delete());
            });
            await Promise.all(deletionPromises);
            return channel.sendMessage("Deleted image for command " + image.command + " due to downvotes.");
        }
    }

    const messageIds = [];
    image.messages.forEach((messageId, i) => {
        messageIds.push({id: messageId, channelId: image.message_channels[i]})
    });
    const messages = await
    utils.getMessagesByIds(messageIds);
    let editPromises = [];
    messages.forEach(message => {
        editPromises.push(message.edit(utils.getImageCommentString(votes, image)));
    });
    return Promise.all(editPromises);
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