/**
 * Created by Tom on 15/02/2017.
 */

module.exports = {
    names: ['choose', 'decide'],
    description: 'Picks one of the given options',
    run: (message, params, keyword) => {
        if(params.length < 2) {
            return message.reply("I need more than one option to choose from!");
        }else if(params.length > 10){
            return message.reply("too many options, can't decide :(");
        }else{
            return message.reply("I pick " + params[Math.floor(Math.random()*params.length)]);
        }
    }
};