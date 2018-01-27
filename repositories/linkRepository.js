/**
 * Created by Tom on 04/06/2017.
 */

"use strict";

const db = require('./db.js').db;

exports.getAuditLinks = () => {
    return db.manyOrNone(`
    select l.*, u.username from link l
    join discord_user u
    where l.type = "AUDIT" and not l.is_deleted
    `)
};

exports.saveAuditLink = (name, url, user_id) => {
    return db.none("insert into link(name, url, type, user_id, date_added) values ($1, $2, 'AUDIT', $4, $3)", [name, url, Math.floor(Date.now()/1000), user_id]);
};

exports.delete = function(id){
    return db.result("update link set is_deleted = true where id = $1 and not is_deleted", [id]).then(result => result.rowCount);
};