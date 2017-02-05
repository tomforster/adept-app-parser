'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname,'config/config.json'))[env];
const log = require('better-logs')('server');
const fs = require('fs');
log.output(fs.createWriteStream('log.txt'));
const app = express();
const ws = require('express-ws')(app);
var auth = require('http-auth');
var basic = auth.basic({
        realm: "Simon Area."
    }, (username, password, callback) => {
        callback(username === config.username && password === config.password);
    }
);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use("/libs/", express.static(path.join(__dirname,"node_modules")));

log.info("Bot:", config.enableDiscordBot);
log.info("Mail:", config.enableMail);
log.info("Cam:", config.enableCam);
log.info("Api:", config.enableApi);

var wow = require('./wow')(config.enableDiscordBot, config.enableMail);
app.use('/parser', wow);

// if(config.enableApi){
//     require('./wow-api')(app);
// }

app.get('/robots.txt',function(req,res){
    log.info('Robot detected.');
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
});

app.use(auth.connect(basic));

if(config.enableCam){
    var securityCam = require('./securityCam')(ws);
    app.use('/', securityCam);
}

app.use('/', router);

// no match from router -> 404
app.use((req, res, next) => {
    const err = new Error(req.url + ' not found');
    err.status = 404;
    next(err);
});

var appParser = require('./appParser.js');
var phantomScripts = require('./phantomScripts.js');

app.listen(config.port,function(){
    // var mail = fs.readFileSync('samplemail.txt', 'utf-8');
    // var mailObj = appParser.parseText(mail);
    // phantomScripts.postApp(mailObj).then(function(url){
    //     console.log(url);
    // });
});