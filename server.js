'use strict';

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
    if ( e.code !== 'EEXIST' ) throw e;
}
log.addTarget('file', {file:'./logs/log-'+timestamp+'.txt'}).withFormatter(palin, {
    rootFolderName: currentDir
});

log.info("Bot:", config.enableDiscordBot);
// log.info("Api:", config.enableWOWApi);
log.info("Apps:", config.enableApplications);

let bot;
if(config.enableDiscordBot){
    bot = require('./discord/discordBot.js');
}

if(config.enableApplications) {
    require('./applicationService')(bot);
}

// if(config.enableWOWApi && config.guildName){
//     require('./warcraftApiService')(config.guildName, undefined, bot);
// }