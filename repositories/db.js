/**
 * Created by Tom on 25/06/2016.
 */

const config = require('./../config');
const pgp = require('pg-promise')();

exports.db = pgp({
    host:config.db.host,
    port:config.db.port,
    database:config.db.name,
    user:config.db.user,
    password:config.db.password
});