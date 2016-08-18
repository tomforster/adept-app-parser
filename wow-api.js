/**
 * Created by Tom on 28/06/2016.
 */

var rp = require('request-promise');
var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
// var webshot = require('webshot');
var logger = require("./logger");
var fs = require('fs');

/*todo:
 * Armory link
 * Specs
 * Wol link
 * Item level
 */

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
var options = {
    screenSize: {
        width: 600, height: 200
    },
    siteType:'html',
    customCSS:'body,html{margin:0; padding:0;} .col{padding:5px; display:inline-block; border: 1px solid black;}'
};

module.exports = function(express){
    app = express;

    var classPromise = rp(classRequestUri)
        .then(function(body){
            var classInfo = JSON.parse(body);
            var classMap = {};
            classInfo.classes.forEach(function(wowClass){
                var color = classColors[wowClass.id];
                if(!color) throw "Class color information not found!";
                classMap[wowClass.id] = {name:wowClass.name, color:classColors[wowClass.id]};
            });
            return classMap;
        }).catch(function(error) {
            logger.error(error.message);
        });

    app.get('/wow/character/:character/:realm?',function(req,res){
        var character = req.params["character"];
        var realm = req.params["realm"];
        if(!character) {
            res.status(400);
            res.send('Bad character name');
        }
        if(!realm) realm = "Frostmane";
        classPromise.then(function(classMap){
            rp(createCharacterUri(character,realm))
                .then(function(body){
                    var charInfo = JSON.parse(body);
                    charInfo.class = classMap[charInfo.class];
                    var auditInfo = itemAudit(charInfo.items);
                    res.render('char-stub.pug',{charInfo:charInfo, raidInfo:getProgression(charInfo), imageUri:getImageUri(charInfo), auditInfo:auditInfo});
                }).catch(function(error){
                    logger.error(error.message);
                    logger.error(character);
                    logger.error(realm);
                    res.send(error.reason);
                })
        })
    });

    //todo add guild param
    app.get('/wow/guild-audit/',function(req,res) {
        //todo create a cache for these
        rp(createGuildUri("Adept"))
            .then(body => JSON.parse(body))
            .then((guildInfo) => {
                return classPromise
                    .then((classMap) => {
                        var memberNames = guildInfo.members.filter(function (member) {
                            return member.rank === 3 || member.rank === 2
                        }).map(function (member) {
                            return member.character.name;
                        }).sort();
                        var memberPromises = [];
                        memberNames.forEach((memberName) => {
                            memberPromises.push(rp(createCharacterUri(memberName, guildInfo.realm))
                                .then(body => {
                                    var charInfo = JSON.parse(body);
                                    if (charInfo.level < 100) return;
                                    charInfo.class = classMap[charInfo.class];
                                    charInfo.audit = itemAudit(charInfo.items);
                                    return charInfo;
                                })
                            )
                        });
                        return Promise.all(memberPromises);
                    });
            })
            .then(members => {
                res.render('audit.pug', {members:members});
            })
            .catch((error) => {
                logger.error(error.message);
                res.send(error.reason);
            })
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