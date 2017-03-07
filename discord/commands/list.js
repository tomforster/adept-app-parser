/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */

const commandRepository = require("./imageRepository");
const log = require('bristol');
const PAGE_SIZE = 10;

function run(message, params) {
    if (params && params.length > 0 && params.length < 3) {
        let commandParam = params[0].toLowerCase();
        let pageParam = 1;
        if (params.length == 2 && !isNaN(params[1]) && params[1] > 0) pageParam = Math.floor(params[1]);
        if (commandParam && typeof commandParam === 'string' && commandParam.length > 0) {
            return commandRepository
                .fetchAll(commandParam)
                .then(results => {
                    log.info("fetched list of " + results.length + " images for " + commandParam);
                    if (!results || results.length == 0) return Promise.resolve()
                    let totalResults = results.length;
                    let pageCount = Math.ceil(results.length / PAGE_SIZE);
                    if (pageParam > pageCount){
                        pageParam = 1;
                    }
                    results = results.slice((pageParam - 1)*PAGE_SIZE, (pageParam - 1)*PAGE_SIZE+PAGE_SIZE);
                    let opMessage = "Saved images " + (1 + PAGE_SIZE*(pageParam-1)) + "-" + (PAGE_SIZE*(pageParam-1) + results.length) + " of " + totalResults + " for command **" + commandParam + "**";
                    opMessage += pageCount > 1 ? " (Page " + pageParam + "/" + pageCount + "):\n" : ":\n";
                    let count = 1 + PAGE_SIZE*(pageParam-1);
                    results.forEach(img => {
                        opMessage += "\n" + count + ": <" + img.url + "> (" + img.id + ") [" + img.author + "]";
                        count++;
                    });
                    if(pageCount > 1){
                        opMessage += "\n\nUse \"!list <command> <page>\" to view other pages."
                    }
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