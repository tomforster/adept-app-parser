/**
 * Created by Tom on 25/06/2016.
 */

"use strict";

const db = require('./../db.js').db;
const moment = require('../node_modules/moment');
const log = require('bristol');

exports.fetchAll = function (command, limit, offset){
    // if(!limit) limit = "ALL";
    if(!offset) offset = 0;
    log.info("fetching", command);
    if(command && typeof command === 'string' && command.length>0){
        return db.any("select c.id as id, c.command, url, c.date_added, du.username as uploader from command c join discord_user du on c.user_id = du.discord_id where command=($1) and is_deleted = false order by c.date_added limit $2 offset $3", [command, limit, offset]);
    }else{
        log.info("type of command incorrect!");
        return [];
    }
};

exports.random = function(command){
    log.info("fetching random");
    if(!command) {
        return db.oneOrNone("SELECT count(*) from command where is_deleted = false").then(result => db.one("SELECT id, command, url, date_added FROM command where is_deleted = false OFFSET floor(random()*$1) LIMIT 1", [result.count]));
    }else{
        return db.oneOrNone("SELECT count(*) from command where command=($1) and is_deleted = false", [command]).then(result => db.one("SELECT id, command, url, date_added FROM command where is_deleted = false and command=$2 OFFSET floor(random()*$1) LIMIT 1", [result.count, command]));
    }
};

exports.save = function(command, url, user_id){
    log.info("saving", command);
    return db.none("insert into command(type, command, url, date_added, user_id) values ($1, $2, $3, $4, $5)", ['image', command, url, moment().unix(), user_id]);
};

exports.delete = function(id){
    log.info("deleting", id);
    return db.result("update command set is_deleted = true where id = $1", [id]).then(result => result.rowCount);
};

exports.safeDelete = function(command, id){
    log.info("deleting", id);
    return db.result("update command set is_deleted = true where id = $1 and command = $2", [id, command]).then(result => result.rowCount);
};