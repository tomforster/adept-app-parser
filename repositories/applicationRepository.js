/**
 * Created by Tom on 01/08/2016.
 */

var db = require('./../db.js').db;
var moment = require('moment');

var logger = require("../logger");

exports.save = function(application){
    logger.info("Saving application", application.name);
    return db.one("insert into application (data, date_received) VALUES ($1, $2) returning id", [application, moment().unix()]);
};