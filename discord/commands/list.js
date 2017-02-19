/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */

const commandRepository = require("../../repositories/commandRepository");
const log = require('better-logs')('discord');

function run(message, params) {
    if (params.length === 1) {
        let commandParam = params[0].toLowerCase();
        if (commandParam && typeof commandParam === 'string' && commandParam.length > 0) {
            return commandRepository
                .fetchAll(commandParam)
                .then(results => {
                    log.info("fetched list of " + results.length + " images for " + commandParam);
                    if (!results || results.length == 0) return;
                    let opMessage = "Saved images for command " + commandParam + ":\n";
                    let count = 1;
                    results.forEach(img => {
                        opMessage += "\n" + count + ": <" + img.url + "> (" + img.id + ") [" + img.uploader + "]";
                        count++;
                    });
                    return message.channel.sendMessage(opMessage);
                })
        }
    }
    return Promise.resolve();
}

module.exports = {
    names: ["list"],
    description: "Lists the available images for a given command.",
    run
};