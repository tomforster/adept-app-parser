'use strict';

const express = require('express');
const path = require('path');
const config = require('./config');
const log = require('bristol');
const palin = require('palin');
const currentDir = __dirname.split("/").length > 1 ? __dirname.split("/").pop() : __dirname.split("\\").pop();
log.addTarget('console').withFormatter(palin, {
    rootFolderName: currentDir
});
let timestamp = new Date().getTime();
const fs = require("fs");
try {
    fs.mkdirSync('./logs');
} catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
}
log.addTarget('file', {file:'./logs/log-'+timestamp+'.txt'}).withFormatter(palin, {
    rootFolderName: currentDir
});
const bodyParser = require("body-parser");
const childProcess = require("child_process");

const app = express();
const ws = require('express-ws')(app);
let auth = require('http-auth');
let basic = auth.basic({
        realm: "Admin Area"
    }, (username, password, callback) => {
        callback(username === config.username && password === config.password);
    }
);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use("/libs/", express.static(path.join(__dirname,"node_modules")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

log.info("Bot:", config.enableDiscordBot);
log.info("Cam:", config.enableCam);
log.info("Api:", config.enableWOWApi);
log.info("Apps:", config.enableApplications);

let bot;
if(config.enableDiscordBot){
    bot = require('./discord/discordBot.js');
}

if(config.enableApplications) {
    let applicationService = require('./applicationService')(bot);
    app.use('/parser', applicationService);
}

if(config.enableWOWApi && config.guildName){
    require('./warcraftApiService')(config.guildName, undefined, bot);
}

const bufferEq = require("buffer-equal-constant-time");
const crypto = require("crypto");
function signData(secret, data) {
    return 'sha1=' + crypto.createHmac('sha1', secret).update(data).digest('hex');
}

//auto redeploy on master commit
app.post('/github', function(req, res){
    log.info("Github webhook received");
    let sig = req.header("x-hub-signature");
    if(!req.body || !sig) {
        log.info("Github webhook invalid message");
        res.status(401).end();
        return;
    }
    if(req.headers["x-github-event"] !== 'push'){
        log.info("Github webhook not a push, ignoring");
        res.status(200).end();
        return;
    }
    const result = bufferEq(new Buffer(signData(config.github, JSON.stringify(req.body))), new Buffer(sig));
    if(result) {
        log.info("Github webhook verified");
        res.status(200).end();
    }else{
        log.info("Github webhook wrong sha1");
        res.status(401).end();
        return;
    }
    log.info("Checking branch...");
    if(req.body.ref === "refs/heads/master") {
        //redeploy
        log.info("Redeploying...");
        childProcess.spawn('sh', ['-c', 'git pull && npm install && pm2 restart appbot'], [], {detached: true})
    }else{
        log.info("Not master commit, ignoring.");
    }
});

app.get('/robots.txt',function(req,res){
    log.info('Robot detected.');
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
});

app.use(auth.connect(basic));

if(config.enableCam){
    let securityCam = require('./securityCam')(ws);
    app.use('/cams', securityCam);
}

app.use(function(req, res, next){
    res.status(404);
    // default to plain-text. send()
    res.type('txt').send('Not found');
});

app.listen(config.port,function(){
});