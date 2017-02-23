/**
 * Created by Tom on 22/02/2017.
 */

const db = require('./../db.js').db;
const moment = require('../node_modules/moment');
const log = require('bristol');

exports.upvote = function(imageId, userId){
    return db.none("insert into vote (image, user_id, date, is_upvote) values ($1, $2, $3, true)", [imageId, userId, moment().unix()]).then(() => true).catch(err => false);
};

exports.downvote = function(imageId, userId){
    return db.none("insert into vote (image, user_id, date) values ($1, $2, $3)",[imageId, userId, moment().unix()]).then(() => true).catch(err => false);
};

exports.getVotes = function(imageId){
    return db.manyOrNone("select * from vote join discord_user on discord_user.id = vote.user_id where image = $1 order by date", imageId);
};