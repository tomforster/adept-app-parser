var Discord = require("discord.js");
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];

var mybot = new Discord.Client();

mybot.on("message", function(message){
    if(message.mentions.length > 0){
        if(message.mentions[0].username == 'AppBot'){
            console.log(message);
            mybot.sendMessage(message.channel, "Hi "+message.author);
        }
    }
});

mybot.login(config.discordEmail, config.discordPassword).then(function(result){
    console.log(result);
});

exports.newAppMessage = function(title,url){
    mybot.sendMessage(mybot.channels.get("name","guild"),"New Application Posted: "+ title + " " + url);
};
