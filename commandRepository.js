/**
 * Created by Tom on 25/06/2016.
 */

var db = require('./db.js').db;
var moment = require('moment');

var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':true})
    ]
});

exports.fetch = function(command){
    logger.info("fetching",command);
    if(command && typeof command === 'string' && command.length>0){
        return db.any("select command, url, date_added from command where command=($1)", [command])
            .then().catch()
    }else{
        logger.info("type of command incorrect!");
        return [];
    }
};

exports.save = function(command, url, user_id){
    logger.info("saving", command);
    return db.none("insert into command(type, command, url, date_added, user_id) values ($1, $2, $3, $4, $5)", ['image', command, url, moment().unix(), user_id]);
};