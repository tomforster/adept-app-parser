/**
 * Created by Tom on 25/06/2016.
 */

var db = require('./db.js').db();
var validUrl = require('valid-url');
var moment = require('moment');

var fetch = function(command){
    if(command && typeof command === 'string' && command.length>0){
        var query = db.query("select command, url, date from command where command=$1",command);
        // Stream results back one row at a time
        var results = [];
        query.on('row', function(row) {
            results.push(row);
        });
        return results;
    }else{
        return null;
    }
};

var allowable_extensions = ['jpeg','jpg','png','gif'];

var save = function(command, url, user_id){
    if(command && typeof command === 'string' && command.length>0 && validUrl.is_uri(url)){
        if(allowable_extensions.indexOf(url.split('.').pop()) == -1){
            return false;
        }
        db.query("insert into command(type, command, url, date, user_id) values ($1, $2, $3, $4, $5)", ['image', command, url, moment().unix(), user_id]);
    }else{
        return false;
    }
};

exports = {
    fetch:fetch,
    save: save
};