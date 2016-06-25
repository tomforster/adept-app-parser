/**
 * Created by Tom on 25/06/2016.
 */

var pg = require('pg');
var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var pgp = require('pg-promise')();

exports.db = pgp({
    host:config.db.host,
    port:config.db.port,
    database:config.db.name,
    user:config.db.user,
    password:config.db.password
});