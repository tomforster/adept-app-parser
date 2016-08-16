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

exports.logMessageAudit = function(discordId, channelId){
    logger.debug("saving message to archive", id);
    if(discordId && typeof discordId === 'string' && discordId.length>0 && channelId && typeof channelId === 'string' && channelId.length>0) {
        return db.one("select user_id from discord_user where discord_id = $1 limit 1", [discordId])
            .then((userId)=>db.one("insert into audit (type, user_id, channel_id, date) values ($1, $2, $3) RETURNING id, user_id, channel_id, date;", ['message', userId, channelId, moment().unix()]));
    }
    throw "Invalid argument";
};

exports.top10UsersByMessageCountWithDuplicateDetection = function(channelId){
    logger.info("Fetching top 10 users by message count with dupe detection", id);
    if (channelId && typeof channelId === 'string' && channelId.length > 0) {
        return db.manyOrNone(`SELECT du.username, count(*) FROM
(
    SELECT user_id,
    lead(user_id) over (order by date) as next_user_id,
    date, type FROM audit where type = 'message' and channelId = $1
) as ids
join discord_user du on du.user_id = ids.user_id
WHERE
type = 'message' and next_user_id <> user_id and channelId = $1
GROUP BY
user_id
ORDER BY
count(*) desc
limit 10;`, [channelId])
    }
    throw "Invalid argument";
};
