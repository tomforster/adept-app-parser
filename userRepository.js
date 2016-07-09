/**
 * Created by Tom on 25/06/2016.
 */

var db = require('./db.js').db;
var moment = require('moment');

var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':true})
    ]
});

exports.fetch = function(id){
    logger.info("fetching", id);
    return db.oneOrNone("select id, discord_id, username, date_added from discord_user where id=($1)", [id]);
};

exports.fetchByDiscordId = function(discordId){
    logger.info("fetching by discord id", discordId);
    if(discordId && typeof discordId === 'string' && discordId.length>0){
        return db.oneOrNone("select id, discord_id, username, date_added from discord_user where discord_id=($1)", [discordId]);
    }else{
        logger.info("user id not valid.");
        throw "Invalid argument";
    }
};

exports.save = function(discordId, username){
    logger.info("saving", username);
    if(discordId && typeof discordId === 'string' && discordId.length>0 && username && typeof username === 'string' && username.length>0) {
        return db.one("insert into discord_user (discord_id, username, date_added) values ($1, $2, $3) RETURNING id, discord_id, username, date_added;", [discordId, username, moment().unix()]);
    }
    throw "Invalid argument";
};

exports.updateUsername = function(id, username){
    logger.info("updating", username);
    if(username && typeof username === 'string' && username.length>0) {
        return db.one("update discord_user set username = ($1) where id = ($2) RETURNING id, discord_id, username, date_added;", [username, id]);
    }
    throw "Invalid argument";
};