/**
 * @author Tom Forster
 *         Date: 10/02/2017
 */

const log = require('bristol');
const commandRepository = require('../repositories/imageRepository');
const voteRepository = require('../repositories/voteRepository');
const rp = require('request-promise');
const humanizeDuration = require('humanize-duration');
const bot = require('./bot');

const MAX_SIZE = 5000000;
const allowable_extensions = ['jpeg', 'jpg', 'png', 'gif', 'gifv'];
const numberEmojis = ["1⃣","2⃣","3⃣","4⃣","5⃣","6⃣","7⃣","8⃣","9⃣"];

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
        return voteRepository.getVotes(img.id).then(votes => {
            img.comment = getImageCommentString(votes, img);
            return img
        })
    });
}

function getImageCommentString(votes, img){
    let dv = 0;
    let uv = 0;
    if(votes && votes.length > 0) {
        dv = votes.filter(vote => !vote.is_upvote).length;
        uv = votes.filter(vote => vote.is_upvote).length;
    }
    return `**!${img.command}**\t|\tVotes: __**${uv-dv}**__  [ ⇧ ${uv} | ⇩ ${dv} ]\t|\t*Added by ${img.author} ${humanizeDuration((Math.floor(Date.now()/1000) - Number(img.date_added))*1000, { largest: 1 })} ago*`;
}

async function sendImage(message, img, text){
    const messageResponse = await message.channel.send(text, {files:[{attachment:img.url, name:"image." + img.url.split('.').pop()}]})
    await messageResponse.react("⬆");
    setTimeout(() => messageResponse.react("⬇"), 300);
    return messageResponse;
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

let getParams = function(messageString, command) {
    let words = messageString.split(' ');
    let commandIndex = words.map(word=>word.toLowerCase()).indexOf('!'+command.toLowerCase());
    if (commandIndex === (words.length - 1) || commandIndex < 0) {
        return [];
    }
    let results = [];
    for (let i = commandIndex + 1; i < words.length; i++) {
        results.push(words[i]);
    }
    return results;
};

async function getMessagesByIds(messageIds){
    let messagesPromises = [];
    messageIds.forEach( messageInfo => {
        if (bot.channels.has(messageInfo.channelId)) {
            messagesPromises.push(bot.channels.get(messageInfo.channelId).fetchMessage(messageInfo.id).catch(() => Promise.resolve()));
        }
    });
    return Promise.all(messagesPromises)
        .then(messages => messages.filter(message => !!message));
}

module.exports = {
    getFileSize,
    sendImage,
    allowable_extensions,
    getImage,
    getImageCommentString,
    getParams,
    getMessagesByIds,
    numberEmojis
};