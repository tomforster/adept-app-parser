/**
 * @author Tom Forster
 *         Date: 27/08/2017
 */

const utils = require('../utils');
const pollRepository = require('../../repositories/pollRepository');
const auditRepository = require('../../repositories/auditRepository');

async function run(message, params, command, user)
{
    const commands = params.join(' ').split('|').map(x => x.trim());
    if(commands.length > 2) {
        if(commands.length > 10) {
            return message.reply("Add up to 9 options.");
        }
        const title = commands[0];
        const options = commands.slice(1);
        const poll = await pollRepository.save(title, options, user.id);
        const pollMessage = await message.channel.send(utils.makePollMessage({title, options, author:user.username}, []));
        pollMessage.__pollId = poll.id;
        for(let i = 0; i < options.length; i++){
            await pollMessage.react(utils.numberEmojis[i])
        }
        return pollMessage;
    }
    return message.reply("Add some poll options.");
}

async function onReact(reaction, user, isRemove)
{
    console.log("poll react", isRemove);
    const message = reaction.message;
    //this poll is augmented with the messages its in
    const poll = await auditRepository.findPollByMessageId(message.id);
    const option = utils.numberEmojis.indexOf(reaction.emoji.name);
    if(poll){
        if(user){
            const changed = isRemove ? await pollRepository.removeVotePoll(poll.id, user.id, option) : await pollRepository.votePoll(poll.id, user.id, option);
            console.log(changed);
            if(changed)
            {
                return updateVotesForPoll(poll, message.channel);
            }
            return;
        }
        throw "User not found";
    }
    throw "poll not found";
}

async function updateVotesForPoll(poll)
{
    const votes = await pollRepository.getPollVotes(poll.id);
    const messageIds = [];
    poll.messages.forEach((messageId, i) => {
        messageIds.push({id:messageId, channelId: poll.message_channels[i]})
    });

    const messages = await utils.getMessagesByIds(messageIds);
    let editPromises = [];
    messages.forEach(message => {
        editPromises.push(message.edit(makePollMessage(poll, votes)));
    });
    return Promise.all(editPromises);
}

function makeProgressBar(value, total){
    const segments = 50;
    let progressBar = "[";
    for(let i = 0; i < segments; i++){
        if(total/i < value){
            progressBar += '|';
        }else{
            progressBar += '-';
        }
    }
    return progressBar + `]`;
}

function makePollMessage(poll, votes){
    const title = poll.title;
    const options = poll.options;
    const total = votes.reduce((a,b) => a+b,0);
    let pollMessage = `Poll: "${title}" (Created by ${poll.author})`;
    options.forEach((option,i) =>
    {
        if(option){
            pollMessage += `\n\n${i+1}. ${option} \`${makeProgressBar(votes[i], total)}\` ${votes[i]} Votes (${votes[i]/total*100 || 0}%)`;
        }
    });
    pollMessage += `\n\nDisplaying ${total} votes.`;
    return pollMessage;
}

module.exports = {
    names: ["poll"],
    description: "Creates a new poll.",
    reactions: utils.numberEmojis,
    run,
    onReact
};