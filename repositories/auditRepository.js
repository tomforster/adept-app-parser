/**
 * Created by Tom on 15/08/2016.
 */

var db = require('./../db.js').db;
var moment = require('moment');

var logger = require("../logger");

exports.logMessageAudit = function(userId, channelId, isBotMessage){
    isBotMessage = !!isBotMessage;
    logger.debug("saving message to archive for channel");
    if(channelId && typeof channelId === 'string' && channelId.length>0) {
        return db.one("insert into audit (type, user_id, channel_id, date, is_bot_message) values ($1, $2, $3, $4, $5) RETURNING id, user_id, channel_id, date;", ['message', userId, channelId, moment().unix(), isBotMessage])
    }
    return Promise.reject("Invalid Argument");
};

exports.top10UsersForChannelByMessageCountWithDuplicateDetection = function(channelId, duration){
    logger.debug("Fetching top 10 users by message count with dupe detection for channel", channelId);
    if (channelId && typeof channelId === 'string' && channelId.length > 0) {
        if(duration && duration > 0 && typeof duration === 'number'){
            var start = moment().subtract(duration, 'milliseconds').unix();
            return db.manyOrNone(`SELECT du.username, count(*) FROM
(
    SELECT 
        user_id,
        lead(user_id) over (order by date) as next_user_id,
        date,
        type
        FROM audit where type = 'message' and channel_id = $1 and is_bot_message is false and date > $2
) as ids
join discord_user du on du.id = ids.user_id
WHERE
next_user_id <> user_id or next_user_id is null
GROUP BY
user_id, du.username
ORDER BY
count(*) desc
limit 10;`, [channelId, start])
        }
        return db.manyOrNone(`SELECT du.username, count(*) FROM
(
    SELECT 
        user_id,
        lead(user_id) over (order by date) as next_user_id,
        date,
        type
        FROM audit where type = 'message' and channel_id = $1 and is_bot_message is false
) as ids
join discord_user du on du.id = ids.user_id
WHERE
next_user_id <> user_id or next_user_id is null
GROUP BY
user_id, du.username
ORDER BY
count(*) desc
limit 10;`, [channelId])
    }
    return Promise.reject("Invalid Argument");
};

exports.top10UsersForServerByMessageCountWithDuplicateDetection = function(channelIds, duration){
    logger.debug("Fetching top 10 users by message count with dupe detection for channels", channelIds);
    if (channelId && typeof channelId === 'string' && channelId.length > 0) {
        if(duration && duration > 0 && typeof duration === 'number'){
            var start = moment().subtract(duration, 'milliseconds').unix();
            return db.manyOrNone(`SELECT du.username, count(*) FROM
(
    SELECT 
        user_id,
        lead(user_id) over (order by date) as next_user_id,
        date,
        type
        FROM audit where type = 'message' and channel_id in ($1^) and is_bot_message is false and date > $2
) as ids
join discord_user du on du.id = ids.user_id
WHERE
next_user_id <> user_id or next_user_id is null
GROUP BY
user_id, du.username
ORDER BY
count(*) desc
limit 10;`, [channelIds, start])
        }
        return db.manyOrNone(`SELECT du.username, count(*) FROM
(
    SELECT 
        user_id,
        lead(user_id) over (order by date) as next_user_id,
        date,
        type
        FROM audit where type = 'message' and channel_id in ($1^) and is_bot_message is false
) as ids
join discord_user du on du.id = ids.user_id
WHERE
next_user_id <> user_id or next_user_id is null
GROUP BY
user_id, du.username
ORDER BY
count(*) desc
limit 10;`, [channelIds])
    }
    return Promise.reject("Invalid Argument");
};