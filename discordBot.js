var Discord = require("discord.js");
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];

var mybot = new Discord.Client();

mybot.on("message", function(message){
    console.log(message);
    if(message.content === "ping")
        mybot.reply(message, "pong");
});

var blah = mybot.login(config.discordEmail, config.discordPassword);
console.log(config.discordEmail);
console.log(blah);
