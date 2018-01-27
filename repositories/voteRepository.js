/**
 * Created by Tom on 22/02/2017.
 */

const db = require('./db.js').db;
const log = require('bristol');

exports.upvote = function(imageId, userId){
    return db.result(`insert into vote (image, user_id, date, is_upvote) 
    select $1, $2, $3, true 
    where not exists (
    select * from vote where image = $1 and user_id = $2 and is_upvote = true and date between $3 - 60*60*24 and $3
    )`, [imageId, userId, Math.floor(Date.now()/1000)])
        .then(result => result.rowCount > 0).catch(err => false);
};

exports.downvote = function(imageId, userId){
    return db.result(`insert into vote (image, user_id, date) 
    select $1, $2, $3 
    where not exists (
    select * from vote where image = $1 and user_id = $2 and is_upvote = false and date between $3 - 60*60*24 and $3
    )`, [imageId, userId, Math.floor(Date.now()/1000)])
        .then(result => result.rowCount > 0).catch(err => false);
};

exports.deleteUpvote = function(imageId, userId){
    return db.result("delete from vote where image = $1 and user_id = $2 and is_upvote and date between $3 - 60*60*24 and $3", [imageId, userId, Math.floor(Date.now()/1000)])
        .then(result => result.rowCount > 0).catch(err => false);
};

exports.deleteDownvote = function(imageId, userId){
    return db.result("delete from vote where image = $1 and user_id = $2 and not is_upvote and date between $3 - 60*60*24 and $3", [imageId, userId, Math.floor(Date.now()/1000)])
        .then(result => result.rowCount > 0).catch(err => false);
};

exports.getVotes = function(imageId){
    return db.manyOrNone("select * from vote join discord_user on discord_user.id = vote.user_id where image = $1 order by date", imageId);
};
//language=PostgreSQL
exports.getUsersWithHighestScore = (limit) => {
    return db.manyOrNone(`
      SELECT u.username, sum(total) as total from (
                                                    SELECT
                                                      i.*,
                                                      sum(CASE WHEN v.is_upvote
                                                        THEN 1
                                                          ELSE -1 END) AS total
                                                    FROM image i
                                                      JOIN vote v ON v.image = i.id
                                                    GROUP BY i.id
                                                    ORDER BY total ASC) as votes_per_image
        JOIN discord_user u on votes_per_image.user_id = u.id
      GROUP BY username
      ORDER BY total DESC
      LIMIT $1
    `, limit);
};
//language=PostgreSQL
exports.getUsersWithLowestScore = (limit) => {
    return db.manyOrNone(`
      SELECT u.username, sum(total) as total from (
                                                    SELECT
                                                      i.*,
                                                      sum(CASE WHEN v.is_upvote
                                                        THEN 1
                                                          ELSE -1 END) AS total
                                                    FROM image i
                                                      JOIN vote v ON v.image = i.id
                                                    GROUP BY i.id
                                                    ORDER BY total ASC) as votes_per_image
        JOIN discord_user u on votes_per_image.user_id = u.id
      GROUP BY username
      ORDER BY total ASC
      LIMIT $1
    `, limit);
};
//language=PostgreSQL
exports.getUsersWithHighestAverageScore = (limit) => {
    return db.manyOrNone(`
      SELECT u.username, avg(total) as average from (
          SELECT
           i.*,
           sum(CASE WHEN v.is_upvote
             THEN 1
               ELSE -1 END) AS total
         FROM image i
           JOIN vote v ON v.image = i.id
         GROUP BY i.id
         ORDER BY total ASC) as votes_per_image
        JOIN discord_user u on votes_per_image.user_id = u.id
      GROUP BY username
      order by average DESC
      LIMIT $1
    `, limit);
};
//language=PostgreSQL
exports.getUsersWithLowestAverageScore = (limit) => {
    return db.manyOrNone(`
      SELECT u.username, avg(total) as average from (
              SELECT
               i.*,
               sum(CASE WHEN v.is_upvote
                 THEN 1
                   ELSE -1 END) AS total
             FROM image i
               JOIN vote v ON v.image = i.id
             GROUP BY i.id
             ORDER BY total ASC) as votes_per_image
        JOIN discord_user u on votes_per_image.user_id = u.id
      GROUP BY username
      ORDER BY average ASC
      LIMIT $1
    `, limit);
};