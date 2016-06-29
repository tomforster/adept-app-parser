/**
 * Created by Tom on 28/06/2016.
 */

var request = require('request');
var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
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

module.exports = function(express){
    app = express;

    request(createCharacterUri("Roonié"), function (error, response, body) {
        if (error) {
            logger.error(error.message);
        } else if (response.statusCode !== 200) {
            logger.error("Got status code " + response.statusCode);
        } else if (!error && response.statusCode == 200) {
            var charInfo = JSON.parse(body);
            app.render('char-stub.pug',{charInfo:charInfo},function(err, html){
                logger.info(html);
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