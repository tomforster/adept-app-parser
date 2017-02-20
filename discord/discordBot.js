const Discord = require("discord.js");
const path = require("path");
const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, '../config/config.json'))[env];
const phantomScripts = require('./../phantomScripts');
const log = require('better-logs')('discord');

const commandRepository = require('./../repositories/commandRepository');
const userRepository = require('./../repositories/userRepository');
const auditRepository = require('./../repositories/auditRepository');
const messageCache = require('./utils').messageCache;

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

        log.info("running command",keyword,"for user",message.author.username,"with id",message.author.id);
        let commandPromise = command.run(message, params, keyword);
        Promise.all([userDetailsPromise, commandPromise]).then(result => auditRepository.logCommandAudit(result[0].id, message.channel.id, keyword, params)).catch(err => log.error(err));
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
        let originalImageData = messageCache.find(id);
        if(originalImageData){
            let img = originalImageData.img;
            commandRepository.delete(img.id).then(() => {
                message.channel.sendMessage("Deleted image for command "+ (img.command));
                message.delete();
                messageCache.remove(id);
            });
        } else{
            messageReaction.message.channel.sendMessage("Cannot delete image, too much time has passed or I restarted recently :(")
        }
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