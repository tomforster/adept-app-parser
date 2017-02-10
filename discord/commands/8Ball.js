/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */

const magicEightResponses = [
    'it is certain',
    'it is decidedly so',
    'without a doubt',
    'yes — definitely',
    'you may rely on it',
    'as I see it, yes',
    'most likely',
    'outlook good',
    'yes',
    'signs point to yes',
    'reply hazy, try again',
    'ask again later',
    'better not tell you now',
    'cannot predict now',
    'concentrate and ask again',
    'don’t count on it',
    'my reply is no',
    'my sources say no',
    'outlook not so good',
    'very doubtful'
];

function run(message, params){
    return message.reply(magicEightResponses[Math.floor(Math.random() * magicEightResponses.length)]);
}

module.exports = {
    names: ["8ball"],
    description: "Ask Appbot a question, then consult the magic eight ball.",
    run
};