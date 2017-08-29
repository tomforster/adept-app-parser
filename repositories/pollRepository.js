"use strict";

const db = require('./db.js').db;
const moment = require('moment');

exports.save = async function(title, options, user_id){
    if(options.length > 9) throw "too many options";
    const params = [title, user_id, moment().unix()];
    [].push.apply(params, options);
    for(let i = 0; i < 12; i++){
        if(params[i] === undefined) params[i] = null;
    }
    return db.one("insert into poll(title, user_id, date_added, " +
        "option1, option2, option3, option4, option5, option6, option7, option8, option9) " +
        "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id", params);
};

exports.fetch = async function(pollId){
    const raw = await db.one("select * from poll where id = $1", [pollId]);
    raw.options = [raw.option1, raw.option2, raw.option3, raw.option4, raw.option5, raw.option6, raw.option7, raw.option8, raw.option9];
    return raw;
};

exports.votePoll = async function(pollId, userId, option){
    return db.one(
        `insert into poll_vote (poll, user_id, date, option) values ($1, $2, $3, $4)
        on conflict (poll, user_id) do update set date = $3, option = $4 returning id 
    `, [pollId, userId, moment().unix(), option]);
};

exports.removeVotePoll = async function(pollId, userId, option){
    const result = await db.result("delete from poll_vote where poll = $1 and user_id = $2 and option = $3", [pollId, userId,option]);
    return result.rowCount > 0;
};

exports.getPollVotes = async function(pollId){
    const results = await db.manyOrNone("select * from poll_vote where poll = $1", [pollId]);
    const votes = [];
    results.forEach(result => votes[result.option] = votes[result.option]+1 || 1);
    return votes;
};