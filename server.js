'use strict';

var express = require('express');
var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var logger = require('winston');
logger.add(logger.transports.Console)({'timestamp':true});
var app = express();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use("/libs/", express.static(path.join(__dirname,"node_modules")));

logger.info("Bot: "+config.enableDiscordBot+" Mail: " + config.enableMail + " Cam: "+config.enableCam);

var wow = require('./wow')(app, config.enableDiscordBot, config.enableMail);
if(config.enableCam){
    var securityCam = require('./securityCam')(app);
}

require('./wow-api')(app);

app.get('/robots.txt',function(req,res){
    logger.info('Robot detected.');
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
});

app.listen(config.port,function(){
});