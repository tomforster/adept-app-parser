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

exports.logCommandAudit = function(userId, channelId, messageId, command, params, imageId, pollId){
    if(channelId && typeof channelId === 'string' && channelId.length>0 && params.constructor === Array && messageId && typeof messageId === 'string' && messageId.length>0) {
        return db.one("insert into audit (type, user_id, channel_id, message_reply_id, date, command, params, image, poll) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;", ['command', userId, channelId, messageId, moment().unix(), command, params.join(','), imageId, pollId]);
    }
    return Promise.reject("Invalid Argument");
};

exports.findImageByMessageId = function(id)
{
    return db.oneOrNone(
        //language=PostgreSQL
        `WITH img AS (
              SELECT
                i.*,
                du.username AS author,
                du.discord_id
              FROM audit
                JOIN image i ON i.id = audit.image
                JOIN discord_user du ON du.id = i.user_id
              WHERE audit.type = 'command' AND message_reply_id = $1
              LIMIT 1)
          SELECT
            i.id,
            i.author,
            i.command,
            i.url,
            i.user_id,
            i.date_added,
            i.is_deleted,
            i.discord_id,
            array_agg(a.message_reply_id) AS messages,
            array_agg(a.channel_id) AS message_channels
          FROM img i
            JOIN audit a ON a.image = i.id
          WHERE a.date > $2
          GROUP BY i.id, i.author, i.command, i.url, i.user_id, i.date_added, i.is_deleted, i.discord_id;`,
        [id, moment().subtract(1, 'days').unix()]);
};

exports.findPollByMessageId = async function(id)
{
    const raw = await db.one(
        //language=PostgreSQL
        `WITH cp AS (
            SELECT
              p.*,
              du.username AS author,
              du.discord_id
            FROM audit au
              JOIN poll p ON p.id = au.poll
              JOIN discord_user du ON du.id = p.user_id
            WHERE au.type = 'command' AND message_reply_id = $1
            LIMIT 1)
        SELECT
          p.id, p.title, p.date_added, p.author, p.discord_id, p.option1, p.option2, p.option3,
          p.option4, p.option5, p.option6, p.option7, p.option8,p.option9,
          array_agg(a.message_reply_id) AS messages,
          array_agg(a.channel_id) AS message_channels
        FROM cp p
          JOIN audit a ON a.poll = p.id
        WHERE a.date > $2
        GROUP BY p.id, p.title, p.date_added, p.author, p.discord_id, p.discord_id, p.option1, p.option2, p.option3,
          p.option4, p.option5, p.option6, p.option7, p.option8,p.option9`,
        [id, moment().subtract(1, 'days').unix()]);
    raw.options = [raw.option1, raw.option2, raw.option3, raw.option4, raw.option5, raw.option6, raw.option7, raw.option8, raw.option9];
    return raw;
};

exports.getRecentImageMessageAudits = function(){
    return db.manyOrNone("select id, date, channel_id, message_reply_id, image from audit where date > $1 and type = 'command' order by date desc limit 100", [moment().subtract(1, 'days').unix()]);
};

exports.logLegendaryAudit = function(charId, legoId){
    return db.none("insert into audit (type, character_id, legendary_id, date) values ($1, $2, $3, $4)", ["legendary", charId, legoId, moment().unix()]).then(() => true).catch(err => false);
};