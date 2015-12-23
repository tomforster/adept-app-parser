var Discord = require("discord.js");
var config = require(path.join(__dirname,'config/config.json'))[env];

var mybot = new Discord.Client();

mybot.on("message", function(message){
    if(message.content === "ping")
        mybot.reply(message, "pong");
});

mybot.login(config.discordEmail, config.discordPassword);
