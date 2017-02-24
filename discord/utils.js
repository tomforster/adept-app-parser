/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */

const log = require('bristol');
const commandRepository = require('./../repositories/imageRepository');
const voteRepository = require('./../repositories/voteRepository');
const rp = require('request-promise');

const MAX_SIZE = 5000000;
const allowable_extensions = ['jpeg', 'jpg', 'png', 'gif'];

function getImage(command){
    return commandRepository.random(command).then(img => {
        if(!img) return;
        log.info("fetched file: ", img.command.toLowerCase(), img.url);
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
    }).then(img => {
        voteRepository.getVotes(img.id).then(votes => {
            img.comment = getImageCommentString(votes, command)
            return img
        })
    });
}

function getImageCommentString(votes, command){
    let dv = 0;
    let uv = 0;
    if(votes && votes.length > 0) {
        let dv = votes.filter(vote => !vote.is_upvote).length;
        let uv = votes.filter(vote => !vote.is_upvote).length;
    }
    return `**${uv-dv}** (${uv}|${dv}) !${command}`;
}

function sendImage(message, img, text){
    return message.channel.sendFile(img.url, "image." + img.url.split('.').pop(), text);
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
module.exports = {
    getFileSize,
    sendImage,
    allowable_extensions,
    getImage,
    getImageCommentString
};