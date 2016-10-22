/**
 * Created by Tom on 25/06/2016.
 */

"use strict";

var db = require('./../db.js').db;
var moment = require('moment');

const log = require('better-logs')('command_repo');

exports.fetch = function(command){
    log.debug("fetching", command);
    if(command && typeof command === 'string' && command.length>0){
        return db.any("select command, url, c.date_added, du.username as uploader from command c join discord_user du on c.user_id = du.discord_id where command=($1)", [command]);
    }else{
        log.debug("type of command incorrect!");
        return [];
    }
};

exports.random = function(){
    log.debug("fetching random");
    return db.one("SELECT count(*) from command").then(result => db.one("SELECT command, url, date_added FROM command OFFSET floor(random()*$1) LIMIT 1", [result.count]));
};

exports.save = function(command, url, user_id){
    log.debug("saving", command);
    return db.none("insert into command(type, command, url, date_added, user_id) values ($1, $2, $3, $4, $5)", ['image', command, url, moment().unix(), user_id]);
};