/**
 * @author Tom Forster
 *         Date: 27/08/2017
 */

const utils = require('../utils');
const pollRepository = require('../../repositories/pollRepository');

async function run(message, params, command, user) {
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

module.exports = {
    names: ["poll"],
    description: "Creates a new poll.",
    run
};