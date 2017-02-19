/**
* author: Tom
* creation date: 28/06/2016
*/

"use strict";
const log = require('better-logs')('wowapi');
const rp = require('request-promise').defaults({json:true});
const path = require('path');
const config = require(path.join(__dirname,'config/config.json'))[process.env.NODE_ENV || "development"];
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

function retryWrapper(fun){
    let numRetries = 5;
    return fun().catch(() => {
        if(numRetries === 0){
            log.error(error);
            throw('failed after 5 retries');
        }
        numRetries--;
        return fun();
    })
}


function getCharacterStats(guild, realm){
    log.info("Starting character stats run");
    return retryWrapper(() => {
        return rp(createGuildUri(guild, realm))
            .then(guildInfo => {
                let promises = [];
                let filteredMembers = guildInfo.members.filter(member => member.character.level === 110 && member.rank < 3).map(member => member.character);
                filteredMembers.forEach(member => {
                    let name = member.name;
                    let character = {name: member.name, class: member.class, spec: member.spec.order, id: stringHash(member.thumbnail)};
                    promises.push(retryWrapper(() => {
                        return rp(createCharacterUri(name, realm))
                            .then(charInfo => {
                                let mainHand = charInfo.items.mainHand;
                                if(mainHand.quality === 6 && mainHand.hasOwnProperty("artifactTraits")){
                                    character.artifactTraits = mainHand.artifactTraits.reduce((acc, val) => acc + val.rank, 0);
                                }
                                character.totalAP = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(30103)] || 0;
                                character.wQCompleted = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(33094)] || 0;
                                return character;
                            })
                    }).catch(err => {
                        log.error("failed on", name, err);
                        return character;
                    }));
                });
                return Promise.all(promises);
            }).then(results => {
                log.info("Completed character stats run, got stats for", results.length, "characters");
                return results.sort((a,b) => b.name - a.name);
            })
    });
}

let createCharacterUri = function(character, realm){
    if(character && character.length >0){
        if(!realm || realm.length < 3){
            realm = "Frostmane";
        }
        return apiUriPathStart + characterRequestUriPath + encodeURIComponent(realm) + '/' + encodeURIComponent(character) + '?fields=achievements,items&' + uriEnd;
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

module.exports = function(guild, realm){
    log.info("Adding scheduled task to retrieve guild stat info");
    cron.schedule('0 * * * *', () => {
        getCharacterStats(guild, realm).then(characters => characters.forEach(character => auditRepository.logCharacterStatsAudit(character).catch(error => log.error(error)))).catch(error => log.error(error));
    }, true);
};