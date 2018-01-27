/**
 * Created by Tom on 01/08/2016.
 */

const db = require('./db.js').db;
const log = require('bristol');

exports.save = function(wpId, date, character, data, processedApp){
    log.info("Saving application", character.name);
    return db.one("insert into application (wp_id, application_date, character, data, processed_date, processed_app) " +
        "VALUES ($1, $2, $3, $4, $5, $6) returning id",
        [wpId, date, JSON.stringify(character), JSON.stringify(data), Math.floor(Date.now()/1000), JSON.stringify(processedApp)]);
};

exports.getLatestApplicationId = function(){
    return db.one("select coalesce((select max(wp_id) from application), 0) as id");
};

exports.getPendingApplications = function(){
    return db.manyOrNone("select * from application where state = 'PENDING' order by processed_date desc");
};

exports.markApplicationAsPosted = function(id, url){
    return db.none("update application set state = 'SENT', posted_to_forum_date = $2, forum_url = $3 where id = $1", [id, Math.floor(Date.now()/1000), url]);
};