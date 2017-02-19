/**
 * Created by Tom on 01/08/2016.
 */

var db = require('./../db.js').db;
var moment = require('moment');

const log = require('better-logs')('application_repo');

exports.save = function(application){
    log.info("Saving application", application.name);
    return db.one("insert into application (data, date_received) VALUES ($1, $2) returning id", [application, moment().unix()]);
};