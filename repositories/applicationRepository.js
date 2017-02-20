/**
 * Created by Tom on 01/08/2016.
 */

const db = require('./../db.js').db;
const moment = require('../node_modules/moment');
const log = require('bristol');

exports.save = function(application){
    log.info("Saving application", application.name);
    return db.one("insert into application (data, date_received) VALUES ($1, $2) returning id", [application, moment().unix()]);
};