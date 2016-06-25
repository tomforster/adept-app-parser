/**
 * Created by Tom on 25/06/2016.
 */

var db = require('./db.js').db();
var validUrl = require('valid-url');
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
        db.connect(function(err){
            if (err) throw err;
            return db.query("select command, url, date_added from command where command=($1)", [command], function(err, result){
                if (err) throw err;
                logger.info(result.rows);

                db.end(function (err) {
                    if (err) throw err;
                });
                return result.rows;
            });
        });
    }else{
        logger.info("type of command incorredt!");
        return [];
    }
};

var allowable_extensions = ['jpeg','jpg','png','gif'];

exports.save = function(command, url, user_id){
    logger.info("saving", command);
    if(command && typeof command === 'string' && command.length>0 && validUrl.is_uri(url)){
        if(allowable_extensions.indexOf(url.split('.').pop()) == -1){
            return false;
        }
        db.connect(function(err){
            if (err) throw err;
            db.query("insert into command(type, command, url, date_added, user_id) values ($1, $2, $3, $4, $5)", ['image', command, url, moment().unix(), user_id], function(err, result){
                if (err) throw err;

                db.end(function (err) {
                    if (err) throw err;
                });
            });
        })

    }else{
        return false;
    }
};