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
const legendaryIds = [
    132376, 137014, 140846, 132443, 137024, 137084, 137102, 132445, 132460, 137072, 137038, 132409, 144277, 137060, 144249,
    144358, 137052, 133977, 137017, 144361, 137101, 137088, 137019, 137086, 137040, 133976, 137066, 144293, 132442, 133800,
    132863, 144280, 144279, 137100, 137018, 132441, 137097, 137041, 137030, 137074, 137095, 137028, 137015, 137036, 137067,
    137616, 132447, 137026, 132861, 137045, 137050, 132456, 144354, 137027, 137051, 138854, 137043, 137063, 137079, 144274,
    137099, 137047, 137082, 137057, 132394, 144260, 137046, 137039, 137049, 137085, 137044, 137065, 137108, 144244, 137029,
    132374, 137053, 144259, 138949, 132366, 132454, 144295, 132411, 133974, 137068, 144369, 137048, 137022, 137056, 132407,
    141353, 138140, 132864, 137107, 144236, 144273, 137220, 132406, 144303, 137090, 132437, 132450, 132451, 137087, 137276,
    137034, 137104, 132455, 144432, 137076, 132375, 137092, 138879, 132459, 137096, 132449, 132357, 132457, 137058, 137083,
    137023, 132444, 144355, 137227, 137061, 144247, 132453, 144364, 132393, 132413, 137080, 132466, 137071, 132378, 137016,
    144275, 137223, 132452, 132367, 132365, 137032, 132410, 144340, 141321, 132379, 132436, 144281, 137025, 144292, 138117,
    137103, 132381, 137075, 137042, 137382, 137078, 137035, 137091, 137021, 137062, 144239, 132448, 144326, 137064, 133973,
    137054, 137094, 137031, 137089, 143728, 132458, 137070, 137059, 137033, 143732, 137073, 137105, 137037, 144258, 144385,
    137081, 137077, 137020, 132369, 137069, 132461, 137109, 144242, 133970, 144438, 133971, 137055, 137098, 143613
];

function retryWrapper(fun, numRetries){
    return fun().catch(() => {
        if(numRetries === 0){
            log.error(error);
            throw('failed after 5 retries');
        }
        numRetries--;
        let timedPromise = new Promise((resolve, reject) => {
            setTimeout(() => resolve(), Math.random()*1000);
        });
        return timedPromise.then(() => retryWrapper(fun, numRetries));
    })
}


function getCharacterStats(guild, realm){
    log.info("Starting character stats run");
    return retryWrapper(() => {
        return rp(createGuildUri(guild, realm))
            .then(guildInfo => {
                let promises = [];
                let filteredMembers = guildInfo.members.filter(member => member.character.level === 110 && member.rank < 6).map(member => member.character);
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
                                character.mp2 = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(33096)] || 0;
                                character.mp5 = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(33097)] || 0;
                                character.mp10 = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(33098)] || 0;
                                character.mp15 = charInfo.achievements.criteriaQuantity[charInfo.achievements.criteria.indexOf(32028)] || 0;
                                let feedItems = charInfo.feed.filter(feedItem => feedItem.type === "LOOT");
                                feedItems.forEach(item => {
                                    let legoId = legendaryIds.indexOf(item.itemId);
                                    if(legoId > -1){
                                        log.info("legendary detected with id on character", legoId, character.name);
                                    }
                                });
                                return character;
                            })
                    }, 5).catch(err => {
                        log.error("failed on", name, err);
                        return character;
                    }));
                });
                return Promise.all(promises);
            }).then(results => {
                log.info("Completed character stats run, got stats for " + results.length + " characters");
                return results.sort((a,b) => b.name - a.name);
            })
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

module.exports = function(guild, realm){
    log.info("Adding scheduled task to retrieve guild stat info");
    cron.schedule('0 * * * *', () => {
        getCharacterStats(guild, realm).then(characters => characters.forEach(character => auditRepository.logCharacterStatsAudit(character).catch(error => log.error(error)))).catch(error => log.error(error));
    }, true);
};