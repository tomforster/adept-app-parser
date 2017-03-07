/**
 * Created by Tom on 15/08/2016.
 */

const db = require('./db.js').db;
const moment = require('moment');

const log = require('bristol');

exports.logMessageAudit = function(userId, channelId, isBotMessage){
    isBotMessage = !!isBotMessage;
    // log.info("saving message to audit");
    if(channelId && typeof channelId === 'string' && channelId.length>0) {
        return db.one("insert into audit (type, user_id, channel_id, date, is_bot_message) values ($1, $2, $3, $4, $5) RETURNING id, user_id, channel_id, date;", ['message', userId, channelId, moment().unix(), isBotMessage])
    }
    return Promise.reject("Invalid Argument");
};

exports.top10UsersForChannelByMessageCountWithDuplicateDetection = function(channelId, duration){
    log.info("Fetching top 10 users by message count with dupe detection for channel", channelId);
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
    log.info("Fetching top 10 users by message count with dupe detection for channels", channelIds);
    if (channelIds && channelIds.length > 0) {
        if(duration && duration > 0 && typeof duration === 'number'){
            var start = moment().subtract(duration, 'milliseconds').unix();
            return db.manyOrNone(`SELECT du.username, count(*) FROM
(
    SELECT 
        user_id,
        lead(user_id) over (order by date) as next_user_id,
        date,
        type
        FROM audit where type = 'message' and channel_id in ($1:csv) and is_bot_message is false and date > $2
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
        FROM audit where type = 'message' and channel_id in ($1:csv) and is_bot_message is false
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

exports.logCharacterStatsAudit = function(character){
    if(typeof character === "object" && character.constructor !== Array) {
        return db.one("insert into audit (type, character_id, character_stats, date) VALUES ($1, $2, $3, $4) returning id", ["character_stats", character.id, JSON.stringify(character), moment().unix()]);
    }else{
        return Promise.reject("Invalid Argument");
    }
};

exports.logCommandAudit = function(userId, channelId, messageId, command, params, imageId){
    if(channelId && typeof channelId === 'string' && channelId.length>0 && params.constructor === Array && messageId && typeof messageId === 'string' && messageId.length>0) {
        return db.one("insert into audit (type, user_id, channel_id, message_reply_id, date, command, params, image) values ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;", ['command', userId, channelId, messageId, moment().unix(), command, params.join(','), imageId]);
    }
    return Promise.reject("Invalid Argument");
};

exports.findImageByMessageId = function(id){
    return db.oneOrNone("with img as (select i.*, du.username as author from audit join image i on i.id = audit.image join discord_user du on du.id=i.user_id where audit.type = 'command' and message_reply_id = $1 limit 1) " +
        "select i.id, i.author, i.type, i.command, i.url, i.user_id, i.date_added, i.is_deleted, array_agg(a.message_reply_id) as messages, array_agg(a.channel_id) as message_channels " +
        "from img i join audit a on a.image = i.id where a.date > $2 group by i.id, i.author, i.type, i.command, i.url, i.user_id, i.date_added, i.is_deleted;", [id, moment().subtract(1,'days').unix()]);
};

exports.getRecentImageMessageAudits = function(){
    return db.manyOrNone("select id, date, channel_id, message_reply_id, image from audit where date > $1 and type = 'command' order by date desc limit 100", [moment().subtract(1, 'days').unix()]);
};

exports.logLegendaryAudit = function(charId, legoId){
    return db.none("insert into audit (type, character_id, legendary_id, date) values ($1, $2, $3, $4)", ["legendary", charId, legoId, moment().unix()]).then(() => true).catch(err => false);
};