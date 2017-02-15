/**
 * Created by Tom on 15/02/2017.
 */

module.exports = {
    names: ['choose', 'decide'],
    description: 'Picks one of the given options.',
    run: (message, params) => {
        let paramsString = params.join(' ');
        let processedParams = paramsString.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g);
        if(!processedParams || processedParams.length < 2) {
            return message.reply("I need more than one option to choose from!");
        }
        processedParams = processedParams.map(param => param.replace(/"/g, '').trim()).filter(param => param.length !== 0);
        if(!processedParams || processedParams.length < 2) {
            return message.reply("I need more than one option to choose from!");
        }
        return message.reply("the winner is: " + processedParams[Math.floor(Math.random()*processedParams.length)] + '.');

    }
};