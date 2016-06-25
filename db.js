/**
 * Created by Tom on 25/06/2016.
 */

var pg = require('pg');
var db = null;
var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
exports.db = function(){
    if(db === null){
        db = new pg.Client(config.db);
    }
    return db;
};