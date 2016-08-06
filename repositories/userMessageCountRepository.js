/**
 * Created by Tom on 25/06/2016.
 */

var db = require('./../db.js').db;

var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':true})
    ]
});

exports.fetchByUserId = function(id){
    logger.info("fetching", id);
    return db.oneOrNone("select id, user_id, count from user_message_count where user_id=($1)", [id]);
};

exports.increment = function(userId){
    logger.info("increment", userId);
    return exports.fetchByUserId(userId).then(function(messageCount){
        if(!messageCount){
            return db.one("insert into user_message_count (user_id, count) values ($1, $2) RETURNING id, user_id, count", [userId, 1]);
        }else{
            return db.one("update user_message_count set count = count + 1 where user_id = ($1) RETURNING id, user_id, count;", [userId]);
        }
    });
};

exports.fetchTop10 = function(){
    return db.manyOrNone("select du.username, umc.count from user_message_count umc join discord_user du on umc.user_id = du.id order by count desc limit 10");
};