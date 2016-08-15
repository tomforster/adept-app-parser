/**
 * Created by Tom on 15/08/2016.
 */

var db = require('./../db.js').db;
var moment = require('moment');

var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':true})
    ]
});

export function logMessageAudit(discordId, channelId){
    logger.debug("saving message to archive", id);
    if(discordId && typeof discordId === 'string' && discordId.length>0 && channelId && typeof channelId === 'string' && channelId.length>0) {
        return db.one("insert into audit (type, discord_id, channel_id, date) values ($1, $2, $3) RETURNING id, discord_id, channel_id, date;", ['message', discordId, channelId, moment().unix()]);
    }
    throw "Invalid argument";
}

export function top10UsersByMessageCountWithDuplicateDetection(){
    logger.info("Fetching top 10 users by message count with dupe detection", id);
    return db.manyOrNone("SELECT user_id, count(*) FROM " +
    "(SELECT user_id, lead(discord_id) over (where type = 'message', order by date) as next_user_id, date FROM audit) as ids " +
    "WHERE type = 'message' and next_user_id <> user_id GROUP BY user_id ORDER BY count(*) desc limit 10;")
}

// SELECT user_id, count(*) FROM
// (
//     SELECT user_id,
//     lead(user_id) over (order by date) as next_user_id,
//     date, type FROM audit where type = 'message'
// ) as ids
// WHERE
// type = 'message' and next_user_id <> user_id
// GROUP BY
// user_id
// ORDER BY
// count(*) desc
// limit 10;