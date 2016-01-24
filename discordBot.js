var Discord = require("discord.js");
var path = require("path");
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var phantomScripts = require('./phantomScripts.js');

var mybot = new Discord.Client();

mybot.on("message", function(message){
    if(message.mentions.length > 0){
        if(message.mentions[0].username == 'AppBot'){
            console.log(message);
            var matches = message.content.match(/!(\w+)/);
            if(matches && matches.length == 2){
                var keyword= matches[1];
                switch(keyword){
                    case 'audit': runAudit(message);
                        console.log('audit');
                        break;
                }
            }

            //mybot.sendMessage(message.channel, "Hi "+message.author);
        }
    }
});

var login = function(){
    mybot.login(config.discordEmail, config.discordPassword).then(function(result){

    }).catch(function(error){
        setTimeout(login,30*1000);
    });
};

login();

mybot.on("disconnected", login);


//todo get last updated date
var runAudit = function(message){
    mybot.sendMessage(message.channel, 'One second...');

    phantomScripts.readAudit().then(function(auditInfo){
        var bads = auditInfo.filter(function(player){
            return player.audit !== '0' || player.upgrades !== '100';
        });
        var opString = "";
        bads.forEach(function(bad){
            if(bad.upgrades !== '100'){
                opString += bad.name + " is only " +bad.upgrades +"% upgraded. ";
            }
            if(bad.audit !== '0'){
                opString += bad.name + " is missing an enchant or a gem! ";
            }
        });
        console.log(opString);
        mybot.sendMessage(message.channel, opString);
    });
};

exports.newAppMessage = function(title,url){
    mybot.sendMessage(mybot.channels.get("name","guild"),"New Application Posted: "+ title + " " + url);
};
