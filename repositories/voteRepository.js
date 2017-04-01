/**
 * Created by Tom on 22/02/2017.
 */

const db = require('./db.js').db;
const moment = require('moment');
const log = require('bristol');

exports.upvote = function(imageId, userId){
    return db.result(`insert into vote (image, user_id, date, is_upvote) 
    select $1, $2, $3, true 
    where not exists (
    select * from vote where image = $1 and user_id = $2 and is_upvote = true and date between $3 - 60*60*24*7 and $3
    )`, [imageId, userId, moment().unix()])
        .then(result => result.rowCount > 0).catch(err => false);
};

exports.downvote = function(imageId, userId){
    return db.result(`insert into vote (image, user_id, date) 
    select $1, $2, $3 
    where not exists (
    select * from vote where image = $1 and user_id = $2 and is_upvote = false and date between $3 - 60*60*24*7 and $3
    )`, [imageId, userId, moment().unix()])
        .then(result => result.rowCount > 0).catch(err => false);
};

exports.deleteUpvote = function(imageId, userId){
    return db.result("delete from vote where image = $1 and user_id = $2 and is_upvote and date between $3 - 60*60*24*7 and $3", [imageId, userId, moment().unix()])
        .then(result => result.rowCount > 0).catch(err => false);
};

exports.deleteDownvote = function(imageId, userId){
    return db.result("delete from vote where image = $1 and user_id = $2 and not is_upvote and date between $3 - 60*60*24*7 and $3", [imageId, userId, moment().unix()])
        .then(result => result.rowCount > 0).catch(err => false);
};

exports.getVotes = function(imageId){
    return db.manyOrNone("select * from vote join discord_user on discord_user.id = vote.user_id where image = $1 order by date", imageId);
};