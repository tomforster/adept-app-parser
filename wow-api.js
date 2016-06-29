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

var imageUrlPathStart = "http://render-api-eu.worldofwarcraft.com/static-render/eu/";
var characterRequestUriPathStart = "https://eu.api.battle.net/wow/character/"; //+/:realm/:name?fields=:fieldsArray&locale=:locale&apikey=:apikey
var apiKey = config.battleNetApiKey;

/*todo:
 * Armory link
 * Specs
 * Wol link
 * Boss kills
 * Item level
 * Image
 */

var app = null;
var MAX_LEVEL = 100;
var options = {
    screenSize: {
        width: 400, height: 200
    },
    siteType:'html'
};

module.exports = function(express){
    app = express;

    request(createCharacterUri("Roonié"), function (error, response, body) {
        if (error) {
            logger.error(error.message);
        } else if (response.statusCode !== 200) {
            logger.error("Got status code " + response.statusCode);
        } else if (!error && response.statusCode == 200) {
            var charInfo = JSON.parse(body);
            app.render('char-stub.pug',{charInfo:charInfo, raidInfo:getProgression(charInfo), imageUri:getImageUri(charInfo)},function(err, html){
                logger.info(html);
                webshot(html, 'stub.png', options, function(err) {
                    if(err) logger.info(err);
                });
            });
        }
    });

};

var createCharacterUri = function(character, realm){
    if(character && character.length >0){
        if(!realm || realm.length < 3){
            realm = "Frostmane";
        }
        return characterRequestUriPathStart + realm + '/' + encodeURIComponent(character) + '?fields=items,progression&locale=en_GB&apikey='+apiKey;
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
    var latestRaids = raids.slice(-3);
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