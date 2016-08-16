/**
 * Created by Tom on 15/08/2016.
 */

var db = require('./../db.js').db;
var moment = require('moment');

var logger = require("../logger");

exports.logMessageAudit = function(userId, channelId){
    logger.info("saving message to archive for channel", channelId, typeof channelId);
    if(channelId && typeof channelId === 'string' && channelId.length>0) {
        return db.one("insert into audit (type, user_id, channel_id, date) values ($1, $2, $3) RETURNING id, user_id, channel_id, date;", ['message', userId, channelId, moment().unix()])
    }
    return Promise.reject("Invalid Argument");
};

exports.top10UsersByMessageCountWithDuplicateDetection = function(channelId){
    logger.info("Fetching top 10 users by message count with dupe detection for channel", channelId);
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
    return Promise.reject("Invalid Argument");
};
