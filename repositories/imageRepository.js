/**
 * Created by Tom on 25/06/2016.
 */

"use strict";

const db = require('./db.js').db;
const log = require('bristol');

exports.fetchAll = function (command, limit, offset){
    // if(!limit) limit = "ALL";
    if(!offset) offset = 0;
    log.info("fetching", command);
    if(command && typeof command === 'string' && command.length>0){
        return db.any("select i.id as id, i.command, url, i.date_added, du.username as author from image i join discord_user du on i.user_id = du.id where command=($1) and is_deleted = false order by i.date_added limit $2 offset $3", [command, limit, offset]);
    }else{
        log.info("type of command incorrect!");
        return [];
    }
};

exports.random = function(command){
    log.info("fetching random");
    if(!command) {
        return db.one("SELECT count(*) from image where is_deleted = false")
            .then(result => db.oneOrNone(
                `SELECT i.id, i.command, i.url, i.date_added, du.username as author FROM image i 
                join discord_user du on i.user_id = du.id 
                where is_deleted = false 
                OFFSET floor(random()*$1) 
                LIMIT 1`, [result.count]));
    }else{
        return db.one("SELECT count(*) from image where command=($1) and is_deleted = false", [command])
            .then(result =>
            {
                if(!result.count) return;

                return db.oneOrNone(
                `SELECT i.id, i.command, i.url, i.date_added, du.username as author FROM image i 
                join discord_user du on i.user_id = du.id 
                where is_deleted = false and command=$2 
                OFFSET floor(random()*$1) 
                LIMIT 1`, [result.count, command])
            });
    }
};

exports.save = function(command, url, user_id){
    log.info("saving", command);
    return db.none("insert into image(command, url, date_added, user_id) values ($1, $2, $3, $4)", [command, url, Math.floor(Date.now()/1000), user_id]);
};

exports.delete = function(id){
    log.info("deleting", id);
    return db.result("update image set is_deleted = true where id = $1 and not is_deleted", [id]).then(result => result.rowCount);
};

exports.safeDelete = function(command, id){
    log.info("deleting", id);
    return db.result("update image set is_deleted = true where id = $1 and command = $2", [id, command]).then(result => result.rowCount);
};