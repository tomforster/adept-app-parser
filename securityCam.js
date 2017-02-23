/**
 * Created by Tom on 28/06/2016.
 */

'use strict';

const config = require('./config');
const fs = require('fs');
const _ = require('underscore');
const exec = require('child_process').exec;
const log = require('bristol');
const router = require('express').Router();
const IMAGE_CACHE_SIZE = 64;

const cameras = [
    { name: 'livingroom', directory: '/home/node/security/', recentImages: [], default:true, displayName: "Living Room Camera"},
    { name: 'kitchen', directory: '/home/node/security2/', recentImages: [], default:false, displayName: "Kitchen Camera"},
    { name: 'bedroom', directory: '/home/node/security3/', recentImages: [], default:false, displayName: "Bedroom Camera"}
];

module.exports = function(ws){

    updateImageCaches(ws);
    setInterval(function(){
        updateImageCaches(ws);
    }, 30000);

    router.get('/images/:camera/:tagId', function(req,res) {
        var cameraName = req.params["camera"];
        log.info(`Cat camera ${cameraName} image request.`);
        var camera = getCameraByName(cameraName);
        if(!camera){
            camera = getDefaultCamera()
        }
        res.sendFile(camera.directory + req.params["tagId"]);
    });

    router.get('/cams/:camera?/:numberImgs?', function(req,res) {
        var cameraName = req.params["camera"];
        var number = req.params["numberImgs"];
        number = number && number.match(/^\d+$/) ? Number(number) : 16;
        number = Math.min(number, IMAGE_CACHE_SIZE);
        number = Math.max(1, number);
        log.info(`Cat camera ${cameraName} page request.`);
        var camera = getCameraByName(cameraName);
        if(!camera){
            camera = getDefaultCamera()
        }
        log.info(camera.displayName);
        res.render('gallery.pug', {title: camera.displayName, images : camera.recentImages.slice(0,number)});
    });

    router.post('/snapshot/livingroom/',function(req,res){
        log.info('Snapshot livingroom camera');
        exec('snapshot-cam-1.sh',
            function (error, stdout, stderr) {
                if (error !== null) {
                    log.error(error);
                } else {
                    log.info('stdout: ' + stdout);
                    log.info('stderr: ' + stderr);
                    setTimeout(function(){
                        updateImageCache(getCameraByName("livingroom"), ws);
                    }, 3000);
                }
            }
        );
    });

    router.ws('/socket', function(ws, req) {
        log.info("Cat socket opened.");
    });

    return router;
};

function getDefaultCamera(){
    var camera = cameras.find(camera => camera.default);
    if(!camera) throw "No default camera found!";
    return camera;
}

function getCameraByName(name){
    return cameras.find(camera => camera.name === name);
}

function updateImageCaches(ws){
    cameras.forEach(camera => updateImageCache(camera, ws));
}

function updateImageCache(camera, ws){
    // log.info(`Checking if any updated images for ${camera.name}`);
    var imageCache = camera.recentImages;
    var dir = camera.directory;
    var requestStr = `/images/${camera.name}/`;

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
    log.info("New images found, image cache updated.");
    camera.recentImages = newImageCache;
    setTimeout(function(){
        broadcastRefresh(ws);
    },100);
}

function broadcastRefresh(ws){
    log.info("Sending refresh");
    ws.getWss('/socket').clients.forEach(function (client) {
        log.info("Refreshing "+client.toString());
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