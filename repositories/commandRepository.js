/**
 * Created by Tom on 25/06/2016.
 */

var db = require('./../db.js').db;
var moment = require('moment');

var logger = require('winston');

exports.fetch = function(command){
    logger.info("fetching",command);
    if(command && typeof command === 'string' && command.length>0){
        return db.any("select command, url, date_added from command where command=($1)", [command]);
    }else{
        logger.info("type of command incorrect!");
        return [];
    }
};

exports.random = function(){
    "use strict";
    logger.info("fetching random");
    return db.one("SELECT count(*) from command").then(result => db.one("SELECT command, url, date_added FROM command OFFSET floor(random()*$1) LIMIT 1", [result.count]));
};

exports.save = function(command, url, user_id){
    logger.info("saving", command);
    return db.none("insert into command(type, command, url, date_added, user_id) values ($1, $2, $3, $4, $5)", ['image', command, url, moment().unix(), user_id]);
};