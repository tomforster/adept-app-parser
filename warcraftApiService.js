/**
* author: Tom
* creation date: 28/06/2016
*/

"use strict";
const log = require('bristol');
const rp = require('request-promise').defaults({json:true});
const config = require('./config');
const auditRepository = require('./repositories/auditRepository');
const stringHash = require('string-hash');
const cron = require("node-cron");

const imageUrlPathStart = "http://render-api-eu.worldofwarcraft.com/static-render/eu/";
const apiUriPathStart = "https://eu.api.battle.net/wow/";
const characterRequestUriPath = "character/";
const guildRequestUriPath = "guild/";
const apiKey = config.battleNetApiKey;
const uriEnd = "locale=en_GB&apikey=" + apiKey;

const classRequestUri = "https://eu.api.battle.net/wow/data/character/classes?" + uriEnd;
const classColors = {
    1: "#C79C6E",
    2: "#F58CBA",
    3: "#ABD473",
    4: "#FFF569",
    5: "#FFFFFF",
    6: "#C41F3B",
    7: "#0070DE",
    8:	"#69CCF0",
    9: "#9482C9",
    10:	"#00FF96",
    11: "#FF7D0A",
    12:	"#A330C9",
};
const legendaries = require("./legendaries");

function retryWrapper(fun, numRetries){
    return fun().catch(err => {
        if(numRetries === 0){
            log.error(err);
            throw('failed after 5 retries');
        }
        numRetries--;
        let timedPromise = new Promise((resolve, reject) => {
            let waitTime = 1000 + Math.random()*4000;
            setTimeout(() => {
                resolve()}, waitTime);
        });
        return timedPromise.then(() => retryWrapper(fun, numRetries));
    })
}


function getCharacterStats(guild, realm){
    log.info("Starting character stats run");
    return retryWrapper(() => {
        return rp(createGuildUri(guild, realm))
    }, 5)
        .then(guildInfo => {
            log.info("Got guild info");
            let promises = [];
            let filteredMembers = guildInfo.members.filter(member => member.character.level === 110 && member.rank < 6).map(member => member.character);
            filteredMembers.forEach(member => {
                let name = member.name;
                let character = {name: member.name, class: member.class, spec: member.spec && member.spec.order, id: stringHash(member.thumbnail)};
                promises.push(retryWrapper(() => rp(createCharacterUri(name, realm)), 5)
                    .then(charInfo => {
                        let mainHand = charInfo.items.mainHand;
                        if(mainHand.quality === 6 && mainHand.hasOwnProperty("artifactTraits")){
                            character.artifactTraits = mainHand.artifactTraits.reduce((acc, val) => acc + val.rank, 0);
                        }
                        character.totalAP = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(30103)] || 0;
                        character.wQCompleted = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(33094)] || 0;
                        character.mp2 = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(33096)] || 0;
                        character.mp5 = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(33097)] || 0;
                        character.mp10 = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(33098)] || 0;
                        character.mp15 = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(32028)] || 0;
                        let feedItems = charInfo.feed.filter(feedItem => feedItem.type === "LOOT");
                        character.legosInFeed = [];
                        feedItems.forEach(item => {
                            if(legendaries.hasOwnProperty(item.itemId)){
                                character.legosInFeed.push({id:legendaries[item.itemId].id, name:legendaries[item.itemId].name, timestamp: item.timestamp});
                            }
                        });
                        return character;
                    })
                    .catch(err => {
                        log.error("failed on", name, err);
                        character.legosInFeed = [];
                        return character;
                    })
                )//end of promise push
            });
            return Promise.all(promises);
        }).then(results => {
            log.info("Completed character stats run, got stats for " + results.length + " characters");
            return results.sort((a,b) => b.name - a.name);
        });
}

let createCharacterUri = function(character, realm){
    if(character && character.length >0){
        if(!realm || realm.length < 3){
            realm = "Frostmane";
        }
        return apiUriPathStart + characterRequestUriPath + encodeURIComponent(realm) + '/' + encodeURIComponent(character) + '?fields=achievements,items,feed&' + uriEnd;
    }
    throw "bad params"
};

let createGuildUri = function(guild, realm){
    if(guild && guild.length >0){
        if(!realm || realm.length < 3){
            realm = "Frostmane";
        }
        return apiUriPathStart + guildRequestUriPath + encodeURIComponent(realm) + '/' + encodeURIComponent(guild) + '?fields=members&' + uriEnd;
    }
    throw "bad params"
};

module.exports = function(guild, realm, bot){
    let cronString = '*/5 * * * *';
    log.info("Adding scheduled task to retrieve guild stat info at", cronString);
    cron.schedule(cronString, () => {
        //lots of horrible catches, todo refactor this
        let statsPromise = getCharacterStats(guild, realm);
        statsPromise
            .then(characters => characters.forEach(character => auditRepository.logCharacterStatsAudit(character)
                .catch(log.error)))
            .catch(log.error);

        statsPromise
            .then(characters => characters
                .forEach(character => character.legosInFeed
                    .forEach(lego => {
                        auditRepository.logLegendaryAudit(character.id, lego.id)
                            .then(isNew => {
                                if(isNew && bot) return bot.newLegendaryMessage(character.name, lego);
                            })
                            .catch(log.error)
                    })
                )
            )
            .catch(log.error);
    }, true);
};