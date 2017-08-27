/**
 * @author Tom Forster
 *         Date: 27/08/2017
 */

const rp = require('request-promise');
// https://strawpoll.me/api/v2/polls
// {
//     "title": "This is a test poll.",
//     "options": [
//     "Option #1",
//     "Option #2"
// ],
//     "multi": true
// }

async function run(message, params) {
    const commands = params.join(' ').split('|').map(x => x.trim());
    if(commands.length > 2) {
        const title = commands[0];
        const options = commands.slice(1);

        try {
            const poll = await rp({
                uri: "https://www.strawpoll.me/api/v2/polls",
                method: "POST",
                json: true,
                body: {
                    title,
                    options
                }
            });
            return message.channel.send(`New poll "${title}" created by ${message.author.username}. Vote at <https://www.strawpoll.me/${poll.id}>`);
        }
        catch(e){
            console.log(e);
        }
    }

    return message.reply("Add some poll options.");
}

module.exports = {
    names: ["poll"],
    description: "Creates a new poll.",
    run
};