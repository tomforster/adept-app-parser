/**
 * Created by Tom on 28/06/2016.
 */

"use strict";

var rp = require('request-promise');
rp = rp.defaults({json:true});
var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
const log = require('better-logs')('wowapi');
var fs = require('fs');
var characterRepository = require('./repositories/characterRepository');

var imageUrlPathStart = "http://render-api-eu.worldofwarcraft.com/static-render/eu/";
var characterRequestUriPathStart = "https://eu.api.battle.net/wow/character/";
var guildRequestUriPathStart = "https://eu.api.battle.net/wow/guild/";
var apiKey = config.battleNetApiKey;
var uriEnd = "locale=en_GB&apikey=" + apiKey;
var classRequestUri = "https://eu.api.battle.net/wow/data/character/classes?" + uriEnd;

var itemSlots = [
    'back', 'chest', 'feet', 'finger1', 'finger2', 'hands', 'head', 'legs', 'mainHand',
    'neck', 'offHand', 'shoulder', 'trinket1', 'trinket2', 'waist', 'wrist'
];
var requiresEnchant = [
    'neck', 'back', 'finger1', 'finger2', 'mainHand', 'offHand'
];

var raidAcronyms = {
    7545: "HFC",
    6967: "BRF",
    8026: "EN",
    8025: "NH"
};

var bonusIds = {
    socket: [523, 563, 564, 565],
    warforged: [499, 560, 561, 562],
    avoidance: [40],
    leech: [41],
    speed: [42],
    indestructible: [43],
    mythicRaid: [566],
    heroicRaid: [567]
};

var classColors = {
    6: "#C41F3B",
    12:	"#A330C9",
    11: "#FF7D0A",
    3: "#ABD473",
    8:	"#69CCF0",
    10:	"#00FF96",
    2: "#F58CBA",
    5: "#FFFFFF",
    4: "#FFF569",
    7: "#0070DE",
    9: "#9482C9",
    1: "#C79C6E"
};

var app = null;
var MAX_LEVEL = 100;
var ws = null;

module.exports = function(express){
    app = express;

    ws = require('express-ws')(app);

    rp(classRequestUri)
        .then(function(classInfo){
            var classMap = {};
            classInfo.classes.forEach(function(wowClass){
                var color = classColors[wowClass.id];
                if(!color) throw "Class color information not found!";
                classMap[wowClass.id] = {name:wowClass.name, color:classColors[wowClass.id]};
            });
            return classMap;
        }).
        then(classMap => {

            var getCharacterFromApi = function(character, realm, numRetries){
                if(numRetries == undefined || numRetries == null){
                    numRetries = 5;
                }
                return rp(createCharacterUri(character, realm))
                    .then(charInfo => {
                        log.debug(charInfo.name);
                        charInfo.class = classMap[charInfo.class];
                        charInfo.audit = itemAudit(charInfo.items);
                        return charInfo;
                    })
                    .catch((error) => {
                        if(numRetries == 0){
                            log.error(error);
                            throw('failed after 5 retries');
                        }
                        log.debug('failed character', character, 'retrying...');
                        numRetries--;
                        return getCharacterFromApi(character, realm, numRetries);
                    })
            };

            var getGuildFromApi = function(guild, realm, numRetries){
                if(numRetries == undefined || numRetries == null){
                    numRetries = 5;
                }
                return rp(createGuildUri(guild, realm))
                    .then(guildInfo => {
                        return characterRepository.saveGuild(guildInfo.name, guildInfo.realm)
                            .then(savedGuildInfo => {
                                guildInfo.members.forEach(member => member.character.class = classMap[member.character.class]);
                                var characters = guildInfo.members.map(member => member.character);
                                return {id:savedGuildInfo.id, characters:characters};
                            })
                    })
                    .catch((error) => {
                        if(numRetries == 0){
                            log.error(error);
                            throw('failed after 5 retries');
                        }
                        log.debug('failed guild', guild, 'retrying...');
                        numRetries--;
                        return getGuildFromApi(guild, realm, numRetries);
                    })
            };

            var getCharacterDataWithAudit = function(characterId){
                if(characterId) {
                    return characterRepository
                        .fetchCharacter(characterId)
                        .then(characterData => {
                            if(characterData.full_data == null)
                                return getCharacterFromApi(characterData.data.name, characterData.data.realm)
                                    .then(savedCharacterData => characterRepository.updateCharacterAudit(characterData.id, savedCharacterData))
                                    .then(characterData => {
                                        characterData.full_data.id = characterData.id;
                                        characterData.full_data.lastUpdated = characterData.audit_last_updated;
                                        return characterData.full_data;
                                    });
                            characterData.full_data.id = characterData.id;
                            characterData.full_data.lastUpdated = characterData.audit_last_updated;
                            return Promise.resolve(characterData.full_data)
                        });
                }
                throw "Bad Parameter"
            };

            var getGuildData = function(guild, realm){
                if(guild && realm) {
                    return characterRepository
                        .fetchGuild(guild, realm)
                        .then(guildData => {
                            if(guildData == null){
                                return getGuildFromApi(guild, realm)
                                    .then(guildData => {
                                        var characterPromises = [];
                                        guildData.characters.forEach(characterData =>
                                            characterPromises.push(characterRepository.saveSimpleCharacter(characterData.name, characterData.realm, characterData, guildData.id)));
                                        return Promise.all(characterPromises).then(characters => {
                                            return {id:guildData.id, characters:characters};
                                        });
                                    });
                            }
                            return characterRepository.fetchGuildCharacters(guildData.id).then(characters => {
                                return {id:guildData.id, characters:characters};
                            })
                        })
                        .then(guildData => {
                            guildData.characters.forEach(characterData => characterData.data.id = characterData.id);
                            guildData.characters = guildData.characters.map(character => character.data);
                            return Promise.resolve(guildData);
                        });
                }
            };

            app.get('/wow/audit/:realm/:guild', function(req, res){
                var guild = req.params.guild;
                var realm = req.params.realm;
                if(!guild){
                    res.status(400);
                    res.send('Bad guild name');
                }
                if(!realm){
                    res.status(400);
                    res.send('Bad realm');
                }
                getGuildData(guild, realm)
                    .then(guildData => {
                        guildData.characters = guildData.characters.filter(member => member.level == 100).sort((a,b) => {
                            if (a.class.name < b.class.name)
                                return -1;
                            if (a.class.name > b.class.name)
                                return 1;
                            if(a.name < b.name)
                                return -1;
                            if(a.name > b.name)
                                return 1;
                            return 0;
                        });
                        return characterRepository.fetchTeams(guildData.id).then(teams => {
                            res.render('audit.pug', {
                                guildInfo:{
                                    name: guildData.name,
                                    id: guildData.id,
                                    characters: guildData.characters,
                                    teams: teams
                                }
                            })
                        })
                    })
                    .catch(error => {
                        log.error(error);
                        res.send(error.reason);
                    });
            });

            app.ws('/auditsocket', function(ws, req) {
                log.info("Audit websocket opened.");
                ws.on('message', msg => {
                    var message = JSON.parse(msg);
                    var header = message.header;
                    switch(header) {
                        case 'team.addCharacter' :
                            var team = message.body.team;
                            var characterId = message.body.character;
                            getCharacterDataWithAudit(characterId)
                                .then(character => {
                                    return characterRepository.addToTeam(team, character.id).then(() => {
                                        return character;
                                    }).catch(error => {
                                        // already in team
                                        if (error.constraint && error.constraint === "team_character_uk") {
                                            return null;
                                        }
                                        throw error;
                                    });
                                })
                                .then(character => {
                                    if (character !== null) {
                                        ws.send(JSON.stringify({header: 'team.addCharacter', body: {team:team, character:character}}))
                                    }
                                })
                                .catch(error => {
                                    log.error(error);
                                });
                            break;
                        case 'team.removeCharacter' :
                            var team = message.body.team;
                            var characterId = message.body.character;
                            characterRepository.removeFromTeam(team, characterId)
                                .then(character => {
                                        ws.send(JSON.stringify({header: 'team.removeCharacter', body: {team:team, character:characterId}}))
                                })
                                .catch(error => {
                                    log.error(error);
                                });
                            break;
                        case 'team.list' :
                            var team = message.body.team;
                            characterRepository.fetchTeamCharacters(team)
                                .then(characters => {
                                    characters.forEach(character => {
                                        character.full_data.id = character.id;
                                        character.full_data.lastUpdated = character.audit_last_updated;
                                    });
                                    characters = characters.map(characters => characters.full_data);
                                    ws.send(JSON.stringify({header: 'team.list', body: {team:team, characters:characters}}))
                                })
                                .catch(error => {
                                    log.error(error);
                                });
                            break;
                        case 'team.create' :
                            var teamName = message.body.name;
                            var guildId = message.body.guild;
                            characterRepository.saveTeam(guildId, teamName)
                                .then(team => {
                                    ws.send(JSON.stringify({header: 'team.create', body: {team:team}}));
                                })
                    }
                })
            });
        })
        .catch(function(error) {
            log.error(error.message);
        });

};

var createCharacterUri = function(character, realm){
    if(character && character.length >0){
        if(!realm || realm.length < 3){
            realm = "Frostmane";
        }
        return characterRequestUriPathStart + encodeURIComponent(realm) + '/' + encodeURIComponent(character) + '?fields=items,progression&' + uriEnd;
    }
    throw "bad params"
};

var createGuildUri = function(guild, realm){
    if(guild && guild.length >0){
        if(!realm || realm.length < 3){
            realm = "Frostmane";
        }
        return guildRequestUriPathStart + encodeURIComponent(realm) + '/' + encodeURIComponent(guild) + '?fields=members&' + uriEnd;
    }
    throw "bad params"
};

var getImageUri = function(charInfo){
    if(!charInfo) return "";
    return imageUrlPathStart + charInfo.thumbnail;
};

var getProgression = function(charInfo){
    if(!charInfo || charInfo.level < MAX_LEVEL || !charInfo.progression || !charInfo.progression.raids) return [];
    var raids = charInfo.progression.raids;
    //get last 3 raids
    var latestRaids = raids.slice(-2);
    var info = [];
    latestRaids.forEach(function(raid){
        var raidInfo = {totalBosses: raid.bosses.length, bossesKilled:0};
        if(raidAcronyms[raid.id]){
            raidInfo.name = raidAcronyms[raid.id];
        }else{
            raidInfo.name = raid.name.match(/\b(\w)/g).join('');
        }
        raid.bosses.forEach(function(boss){
            if(boss.mythicKills && boss.mythicKills > 0){
                raidInfo.bossesKilled++;
            }
        });
        //fix for blackhand bug, todo: use achi instead
        if((raid.id === 6967) && (raidInfo.bossesKilled === (raidInfo.totalBosses-1))){
            raidInfo.bossesKilled++;
        }
        info.push(raidInfo);
    });
    return info;
};

var itemAudit = function(items){
    var totalItemUpgradeRatio = 0;
    var numItems = 0;
    var totalMissingGems = 0;
    var totalMissingEnchants = 0;
    itemSlots.forEach(function(itemSlot){
        if(items.hasOwnProperty(itemSlot)){
            var item = items[itemSlot];
            totalMissingEnchants += itemEnchantAudit(item, itemSlot);
            totalMissingGems += itemGemAudit(item);
            totalItemUpgradeRatio += itemUpgradeAudit(item);
            numItems++;
        }
    });
    return {
        averageItemUpgradeRatio: totalItemUpgradeRatio / numItems,
        totalMissingGems:totalMissingGems,
        totalMissingEnchants:totalMissingEnchants,
        result: totalMissingEnchants + totalMissingGems > 0 ? "Failed": "Passed"
    }
};

var itemEnchantAudit = function(item, itemSlot){
    var missingEnchants = 0;
    if (requiresEnchant.indexOf(itemSlot) >= 0) {
        missingEnchants = 1;
        if(item.hasOwnProperty("tooltipParams")){
            if(item["tooltipParams"].hasOwnProperty("enchant") || (itemSlot == "offHand" && !item.hasOwnProperty("weaponInfo"))){
                //todo, check enchant is good
                missingEnchants = 0;
            }
        }
    }
    return missingEnchants;
};

var itemGemAudit = function(item){
    var missingGems = 0;
    if(item.hasOwnProperty('bonusLists')){
        item.bonusLists.forEach(function(bonus){
            if(bonusIds.socket.indexOf(+bonus) > -1){
                missingGems = 1;
                //item has a socket
                if(item.hasOwnProperty("tooltipParams")){
                    if(item["tooltipParams"].hasOwnProperty("gem0") || item["tooltipParams"].hasOwnProperty("gem")){
                        //todo, check gem is good
                        missingGems = 0;
                    }
                }

            }
        })
    }
    return missingGems;
};

var itemUpgradeAudit = function(item){
    var passRatio = 0;
    if(item.quality == 5 || item.quality == 7) return 1;
    if(item.hasOwnProperty("tooltipParams")){
        if(item["tooltipParams"].hasOwnProperty("upgrade")){
            passRatio = item.tooltipParams.upgrade.current / item.tooltipParams.upgrade.total;
        }
    }
    return passRatio;
};