var Discord = require("discord.js");
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];

var mybot = new Discord.Client();

mybot.on("message", function(message){
    if(message.mentions.length > 0){
        if(message.mentions[0].username == 'AppBot'){
            console.log(message);
            mybot.reply(message, "Hi "+message.author.username);
        }
    }
});

mybot.login(config.discordEmail, config.discordPassword).then(function(result){
    console.log(result);
});

exports.newAppMessage = function(title){
    mybot.sendMessage(mybot.channels.get("name","general"),"New Application Posted: "+ title);
}
