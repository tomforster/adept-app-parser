/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */
const utils = require("../utils.js");

function run(message, params) {
    return utils.getImage().then(img => {
        message.react("✅");
        return utils.sendImage(message, img, "Here's your random image: !" + img.command);
    });
}

module.exports = {
    name: "random",
    run: run
};