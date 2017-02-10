const Discord = require("discord.js");
const path = require("path");
const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, 'config/config.json'))[env];
const phantomScripts = require('./../phantomScripts');
const log = require('better-logs')('discord');

const commandRepository = require('./../repositories/commandRepository');
const userRepository = require('./../repositories/userRepository');
const auditRepository = require('./../repositories/auditRepository');

const commands = require("./commands");
const bot = new Discord.Client();

const messageCache = {};

bot.on("message", (message) => {

    //increment message count
    logUserDetails(message.author).then(user => {
        auditRepository.logMessageAudit(user.id, message.channel.id, message.author.equals(bot.user)).catch(error => log.error(error));
    });

    if(message.author.equals(bot.user) || message.author.bot) return;

    let matches = message.content.match(/!(\w+)/);
    if(matches && matches.length == 2){
        let keyword= matches[1].toLowerCase(); //keyword without bang
        logger.debug("Detected command:", keyword);
        let params = getParams(message.content, keyword);
        logger.debug("Detected params:", params);

        let command = commands.find(command => command.name === keyword);
        if(command) {
            log.info("running command",command,"for user",message.author.username,"with id",message.author.id);
            return command.run(message, params, keyword).catch(err => log.error(err));
        }
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

exports.newAppMessage = function(title,url){
    let adeptGuild = bot.guilds.find("name", "Adept");
    if(adeptGuild){
        let guildChannel = adeptGuild.channels.find("name", "guild");
        if(guildChannel){
            return guildChannel.sendMessage("New Application Posted: "+ title + " " + url);
        }
    }
    return Promise.resolve();
};

export function addToMessageCache(message, img){
    if(Object.keys(messageCache).length > 1000){
        Object.keys(messageCache).sort((key1, key2) => messageCache[key1].time - messageCache[key2].time).slice(500).forEach(key => delete messageCache[key]);
    }
    messageCache[message.id] = {img:img, time:new Date().getTime()};
}