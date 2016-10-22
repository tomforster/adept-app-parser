/**
 * Created by Tom on 28/06/2016.
 */

'use strict';

var path = require('path');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var fs = require('fs');
var _ = require('underscore');
var exec = require('child_process').exec;
const log = require('better-logs')('camera');
var router = require('express').Router();
var IMAGE_CACHE_SIZE = 64;

var cameras = [
    { name: '1', directory: '/home/node/security/', recentImages: []},
    { name: '2', directory: '/home/node/security2/', recentImages: []},
    { name: '3', directory: '/home/node/security3/', recentImages: []}
];

module.exports = function(ws){

    updateImageCaches(ws);
    setInterval(function(){
        updateImageCaches(ws);
    }, 30000);

    router.get('/img/:camera/:tagId', function(req,res) {
        var camera = req.params["camera"];
        if(!camera.match(/^\d+$/)) {
            log.info(`Bad cat camera image request (${camera}).`);
            return res.status(404);
        }
        log.info(`Cat camera ${camera} image request.`);

        res.sendFile('/home/node/security/'+req.params["tagId"]);
    });

    router.get('/cams/:camera/:numberImgs?', function(req,res) {
        var camera = req.params["camera"];
        if(!camera.match(/^\d+$/)) {
            log.warn(`Bad cat camera page request (${camera}).`);
            return res.status(404);
        }
        log.info(`Cat camera ${camera} page request.`);
        var number = parseInt(req.params["numberImgs"],10);
        number = !number.match(/^\d+$/) ? 16 : number;
        number = Math.min(number, IMAGE_CACHE_SIZE);
        number = Math.max(1, number);
        if(imageCaches.hasOwnProperty(camera)){
            res.render('gallery.pug', {images : imageCaches[camera].slice(0,number)});
        }
        return res.status(404);
    });

    router.post('/snapshot/1/',function(req,res){
        log.info('Snapshot camera 1');
        exec('snapshot-cam-1.sh',
            function (error, stdout, stderr) {
                if (error !== null) {
                    log.info(error);
                } else {
                    log.info('stdout: ' + stdout);
                    log.info('stderr: ' + stderr);
                    setTimeout(function(){
                        imageCaches[1] = updateImageCache(1, '/home/node/security/','/img/', ws);
                    }, 3000);
                }
            }
        );
    });

    router.ws('/socket', function(ws, req) {
        log.debug("Cat socket opened.");
    });

    return router;
};

function updateImageCaches(ws){
    cameras.forEach(camera => updateImageCache(camera, ws));
}

function updateImageCache(camera, ws){
    log.debug(`Checking if any updated images for ${camera.name}`);
    var imageCache = camera.recentImages;
    var dir = camera.directory;
    var requestStr = `/img/${imageCache.name}/`;

    var files_ = [];
    var files = fs.readdirSync(dir);
    files = files.filter(function(file){return file !== 'lastsnap.jpg' && file.charAt(0) !== '.'});
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
    if(_.isEqual(imageCache, newImageCache)) return;
    log.debug("New images found, image cache updated.");
    camera.recentImages = newImageCache;
    setTimeout(function(){
        broadcastRefresh(ws);
    },100);
}

function broadcastRefresh(ws){
    log.debug("Sending refresh");
    ws.getWss('/socket').clients.forEach(function (client) {
        log.debug("Refreshing "+client.toString());
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