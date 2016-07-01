/**
 * Created by Tom on 28/06/2016.
 */

var request = require('request');
var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var webshot = require('webshot');
var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':true})
    ]
});
var fs = require('fs');

var imageUrlPathStart = "http://render-api-eu.worldofwarcraft.com/static-render/eu/";
var characterRequestUriPathStart = "https://eu.api.battle.net/wow/character/";
var apiKey = config.battleNetApiKey;
var uriEnd = "locale=en_GB&apikey=" + apiKey;
var classRequestUri = "https://eu.api.battle.net/wow/data/character/classes?" + uriEnd;

var itemSlots = [
    'back',
    'chest',
    'feet',
    'finger1',
    'finger2',
    'hands',
    'head',
    'legs',
    'mainHand',
    'neck',
    'offHand',
    'shoulder',
    'trinket1',
    'trinket2',
    'waist',
    'wrist'
];
var requiresEnchant = [
    'neck', 'back', 'finger1', 'finger2', 'mainHand', 'offHand'
];

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

/*todo:
 * Armory link
 * Specs
 * Wol link
 * Item level
 */

var app = null;
var MAX_LEVEL = 100;
var options = {
    screenSize: {
        width: 600, height: 200
    },
    siteType:'html',
    customCSS:'body,html{margin:0; padding:0;} .col{padding:5px; display:inline-block; border: 1px solid black;}'
};
var classMap = {};

module.exports = function(express){
    app = express;

    var classPromise = new Promise(function(resolve, reject){
        request(classRequestUri, function(error, response, body) {
            if (error) {
                logger.error(error.message);
                reject();
            } else if (response.statusCode !== 200) {
                logger.error("Got status code " + response.statusCode);
                reject();
            } else if (!error && response.statusCode == 200) {
                var classInfo = JSON.parse(body);
                classInfo.classes.forEach(function(wowClass){
                    classMap[wowClass.id] = wowClass.name;
                });
                resolve();
            }
        })
    });

    classPromise.then(function(){
        var characterPromise = new Promise(function(resolve, reject){
            request(createCharacterUri("Roonié"), function (error, response, body) {
                if (error) {
                    logger.error(error.message);
                    reject();
                } else if (response.statusCode !== 200) {
                    logger.error("Got status code " + response.statusCode);
                    reject();
                } else if (!error && response.statusCode == 200) {
                    var charInfo = JSON.parse(body);
                    charInfo.className = classMap[charInfo.class];
                    console.log(itemAudit(charInfo.items));
                    app.get('/stub',function(req,res){
                        res.render('char-stub.pug',{charInfo:charInfo, raidInfo:getProgression(charInfo), imageUri:getImageUri(charInfo)});
                    });
                    // app.render('char-stub.pug',{charInfo:charInfo, raidInfo:getProgression(charInfo), imageUri:getImageUri(charInfo)},function(err, html){
                    //     logger.info(html);
                    //     fs.writeFile("public/stubtest.html", html, 'ascii');
                    //     app.get('/stub',function(req,res){
                    //         res.send()
                    //     });
                        // webshot(html, 'stub.png', options, function(err) {
                        //     if(err){
                        //         logger.info(err);
                        //         reject();
                        //     }
                        //     resolve();
                        // });
                    // });
                }
            });
        });
    });
};

var createCharacterUri = function(character, realm){
    if(character && character.length >0){
        if(!realm || realm.length < 3){
            realm = "Frostmane";
        }
        return characterRequestUriPathStart + realm + '/' + encodeURIComponent(character) + '?fields=items,progression&' + uriEnd;
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
        var raidInfo = {name: raid.name, totalBosses: raid.bosses.length, bossesKilled:0};
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
        totalMissingEnchants:totalMissingEnchants
    }
};

var itemEnchantAudit = function(item, itemSlot){
    var missingEnchants = 0;
    if (requiresEnchant.indexOf(itemSlot) >= 0) {
        missingEnchants = 1;
        if(item.hasOwnProperty("tooltipParams")){
            if(item["tooltipParams"].hasOwnProperty("enchant")){
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
    if(item.quality == 5) return 1;
    if(item.hasOwnProperty("tooltipParams")){
        if(item["tooltipParams"].hasOwnProperty("upgrade")){
            //todo, check enchant is good
            passRatio = item.tooltipParams.upgrade.current / item.tooltipParams.upgrade.total;
        }
    }
    return passRatio;
};