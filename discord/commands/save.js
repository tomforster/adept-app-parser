/**
 * @author Tom Forster
 *         Date: 10/02/2017
 */

const validUrl = require('valid-url');
const utils = require('../utils');
const commandRepository = require("../../repositories/imageRepository.js");

function run(message, params, keyword, user){
    if (params.length === 2) {
        let commandParam = params[0].toLowerCase();
        if(commandParam.indexOf('@') > -1){
            return message.reply("you cant add images for commands containing @ symbols.")
        }
        let uriParam = params[1];
        if (commandParam && typeof commandParam === 'string' && commandParam.length > 0 && validUrl.is_uri(uriParam)) {
            if (commandParam.indexOf('!') >= 0) {
                return message.reply("command: " + commandParam + " should not contain exclamation marks.");
            }
            if (commandParam.length > 50) {
                return message.reply("command: " + commandParam + " is too long. Max command length is 50 characters.");
            }
            if (utils.allowable_extensions.indexOf(uriParam.split('.').pop().toLowerCase()) == -1) {
                return message.reply("image: " + uriParam + " has an unknown extension.");
            }

            //todo add duplicate discarding?
            return utils.getFileSize(uriParam).then(result => {
                if (!result) {
                    return message.reply("the image is too large :(");
                } else {
                    return commandRepository
                        .save(commandParam, uriParam, user.id)
                        .then(() => message.reply("new command: " + commandParam + " has been added successfully."))
                }
            }).catch(() => {
                return message.reply("bad url or something ¯\\_(ツ)_/¯");
            });
        }
        else {
            return message.reply("please use the following format: !save <command> <url>. The url must end with an allowed image extension (.jpg, .png, .jpeg, or .gif).");
        }
    }

    return Promise.resolve();
}

module.exports = {
    names: ["save"],
    description: "Saves an image for a given command.",
    run
};