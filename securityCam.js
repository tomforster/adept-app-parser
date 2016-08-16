/**
 * Created by Tom on 28/06/2016.
 */

var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var fs = require('fs');
var basicAuth = require('basic-auth');
var _ = require('underscore');
var exec = require('child_process').exec;
var logger = require("./logger");

var auth = function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.send(401);
    }

    var user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    }

    if (user.name === config.username && user.pass === config.password) {
        return next();
    } else {
        return unauthorized(res);
    }
};

var ws = null;
var IMAGE_CACHE_SIZE = 64;

module.exports = function(app){

    ws = require('express-ws')(app);

    catpicsImageCache = updateImageCache(catpicsImageCache, '/home/node/security/','/catimg/');
    catpics2ImageCache = updateImageCache(catpics2ImageCache, '/home/node/security2/','/catimg2/');

    setInterval(function(){
        catpicsImageCache = updateImageCache(catpicsImageCache, '/home/node/security/','/catimg/')
    }, 30000);

    setInterval(function(){
        catpics2ImageCache = updateImageCache(catpics2ImageCache, '/home/node/security2/','/catimg2/')
    }, 30000);

    app.get('/img/:tagId',auth, function(req,res) {
        logger.info('Saved image request');
        res.sendFile('/home/node/img/'+req.params["tagId"]);
    });
    app.get('/catimg/:tagId',auth, function(req,res) {
        logger.info('Camera 1 image request');
        res.sendFile('/home/node/security/'+req.params["tagId"]);
    });

    app.get('/catimg2/:tagId',auth, function(req,res) {
        logger.info('Camera 2 image request');
        res.sendFile('/home/node/security2/'+req.params["tagId"]);
    });

    app.get('/catpics/:numberImgs?',auth,function(req,res) {
        logger.info('Cat camera 1 page request.');
        var number = parseInt(req.params["numberImgs"],10);
        number = isNaN(number) ? 16 : number;
        number = Math.min(number,IMAGE_CACHE_SIZE);
        number = Math.max(1, number);
        res.render('gallery.pug', {images : catpicsImageCache.slice(0,number)});
    });

    app.get('/catpics2/:numberImgs?',auth,function(req,res) {
        logger.info('Cat camera 2 page request.');
        var number = parseInt(req.params["numberImgs"],10);
        number = isNaN(number) ? 16 : number;
        number = Math.min(number,IMAGE_CACHE_SIZE);
        number = Math.max(1, number);
        res.render('gallery.pug', {images : catpics2ImageCache.slice(0,number)});
    });

    app.get('/catpicsold/',auth,function(req,res) {
        logger.info('Old cat images list');
        res.send(getFiles('/home/node/security/'));
    });

    app.post('/snapshot/1/',function(req,res){
        logger.info('Snapshot camera 1');
        exec('snapshot-cam-1.sh',
            function (error, stdout, stderr) {
                if (error !== null) {
                    logger.info(error);
                } else {
                    logger.info('stdout: ' + stdout);
                    logger.info('stderr: ' + stderr);
                    setTimeout(function(){
                        catpicsImageCache = updateImageCache(catpicsImageCache, '/home/node/security/','/catimg/');
                    }, 3000);
                }
            }
        );
    });

    app.ws('/catpicsocket', function(ws, req) {
        logger.info("Websocket opened.");
    });
};

var catpicsImageCache = [];
var catpics2ImageCache = [];

function updateImageCache (imageCache, dir,requestStr){
    logger.info("Checking if any updated images for "+requestStr);
    var files_ = [];
    var files = fs.readdirSync(dir);
    files = files.filter(function(file){return file !== 'lastsnap.jpg'});
    files.sort(function(a, b) {
        return fs.statSync(dir + b).mtime.getTime() -
            fs.statSync(dir + a).mtime.getTime();
    });
    files.forEach(function(file){
        var name = dir + '/' + file;
        if (!(fs.statSync(name).isDirectory() || getExtension(file) !== 'jpg' || file === 'lastsnap.jpg')) {
            files_.push({url: requestStr + file, time: getImageTime(file), date: getImageDate(file), type: getImageType(file)});
        }
    });
    var newImageCache = files_.slice(0,IMAGE_CACHE_SIZE);
    if(_.isEqual(imageCache, newImageCache)) return imageCache;
    logger.info("New images found, image cache updated.");
    setTimeout(function(){
        broadcastRefresh();
    },100);
    return newImageCache;
}

function broadcastRefresh(){
    logger.info("sending refresh");
    ws.getWss('/catpics').clients.forEach(function (client) {
        logger.info("refreshing "+client.toString());
        client.send('refresh');
    });
}

function getImageTime(str){
    var splitstr = str.split(/[-_]/);
    if(splitstr.length < 7) return "";
    splitstr = splitstr.slice(3,6);
    return splitstr.join(':');
}

function getImageDate(str){
    var splitstr = str.split(/[-_]/);
    if(splitstr.length < 7) return "";
    splitstr = splitstr.slice(0,3);
    return splitstr.join('/');
}

function getImageType(str){
    var matches = str.match(/best/);
    if(matches){
        return "best"
    }
    matches = str.match(/snapshot/);
    if(matches){
        return "snapshot"
    }
    return ""
}

function getExtension(filename) {
    return filename.split('.').pop();
}

function getFiles (dir){
    var files_ = "<html><body>";
    var files = fs.readdirSync(dir);
    files.sort(function(a, b) {
        return fs.statSync(dir + b).mtime.getTime() -
            fs.statSync(dir + a).mtime.getTime();
    });
    files.slice(0,100).forEach(function(file){
        var name = dir + '/' + file;
        if (!fs.statSync(name).isDirectory()){
            files_ +=("<a href='catimg/"+file+"'>"+file+"</a><br>");
        }
    });
    files_ += "</body></html>";
    return files_;
}