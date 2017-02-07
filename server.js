'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname,'config/config.json'))[env];
const log = require('better-logs')('server');
const fs = require('fs');
log.output(fs.createWriteStream('log.txt'));
const bodyParser = require("body-parser");

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
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

log.info("Bot:", config.enableDiscordBot);
log.info("Mail:", config.enableMail);
log.info("Cam:", config.enableCam);
log.info("Api:", config.enableApi);

let wow = require('./wow')(config.enableDiscordBot, config.enableMail);
app.use('/parser', wow);

// if(config.enableApi){
//     require('./wow-api')(app);
// }

const bufferEq = require("buffer-equal-constant-time");
const crypto = require("crypto");
function signData(secret, data) {
    return 'sha1=' + crypto.createHmac('sha1', secret).update(data).digest('hex');
}
const { spawn } = require('child_process')

app.post('/deploy', function(req, res){
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
    log.info("Redeploying...");

    //redeploy
    const deploySh = spawn('sh', [ 'deploy-adept.sh' ], {
        cwd: process.env.HOME,
        env: Object.assign({}, process.env, { PATH: process.env.PATH + ':/usr/local/bin' })
    }).on('error', (err => console.log(err)));
});

app.get('/robots.txt',function(req,res){
    log.info('Robot detected.');
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
});

app.use(auth.connect(basic));

if(config.enableCam){
    let securityCam = require('./securityCam')(ws);
    app.use('/', securityCam);
}

app.use('/', router);

// no match from router -> 404
app.use((req, res, next) => {
    const err = new Error(req.url + ' not found');
    err.status = 404;
    next(err);
});

let appParser = require('./appParser.js');
let phantomScripts = require('./phantomScripts.js');

app.listen(config.port,function(){
    // var mail = fs.readFileSync('samplemail.txt', 'utf-8');
    // var mailObj = appParser.parseText(mail);
    // phantomScripts.postApp(mailObj).then(function(url){
    //     console.log(url);
    // });
});