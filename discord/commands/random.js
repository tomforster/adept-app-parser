/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */
const utils = require("../utils.js");

function run(message, params) {
    return utils.getImage().then(img => {
        if(!img) return Promise.resolve();
        message.react("✅");
        return utils.sendImage(message, img, "Here's your random image: !" + img.command);
    });
}

module.exports = {
    names: ["random"],
    description: "Displays a random image.",
    run: run
};