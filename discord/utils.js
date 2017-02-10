/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */

const log = require('better-logs')('discord');
const commandRepository = require('./../repositories/commandRepository');
const rp = require('request-promise');

const MAX_SIZE = 5000000;
const allowable_extensions = ['jpeg', 'jpg', 'png', 'gif'];

function getImage(command){
    return commandRepository.random(command).then(img => {
        if(!img) return;
        log.info("fetched " + img.command.toLowerCase() + ", filename: "+img.url);
        return getFileSize(img.url).then(result => {
            if(result){
                return img;
            }else{
                throw "Image is too large or removed :(";
            }
        }).catch(() => {
            return commandRepository.delete(img.id).then(() => {
                throw 404
            });
        });
    }).catch(err => {
        log.error(err);
        if(err === 404){
            return getImage(command)
        }
        throw "Unknown image";
    });
}

function sendImage(message, img, text){
    return message.channel.sendFile(img.url, "image." + img.url.split('.').pop(), text).then(result => {
        messageCache.add(result, img);
        return result;
    });
}

function getFileSize(url) {
    return rp({
        url: url,
        method: "HEAD"
    }).then(headRes => {
        let size = headRes['content-length'];
        if(size === "503"){
            return false;
        }
        return size <= MAX_SIZE;
    });
}

class MessageCache {
    constructor() {
        this.cache = [];
    }

    add(message, img){
        if(Object.keys(this.cache).length > 1000){
            Object.keys(this.cache).sort((key1, key2) => this.cache[key1].time - this.cache[key2].time).slice(500).forEach(key => delete this.cache[key]);
        }
        this.cache[message.id] = {img:img, time:new Date().getTime()};
    };

    find(id){
        if(this.cache.hasOwnProperty(id)){
            return (messageCache[id]);
        }
        else{
            return null;
        }
    }

    remove(id){
        if(this.cache.hasOwnProperty(id)){
            delete this.cache[id];
            return true;
        }
        else{
            return false;
        }
    }
}

let messageCache = new MessageCache();

module.exports = {
    getFileSize,
    sendImage,
    allowable_extensions,
    getImage,
    messageCache
};