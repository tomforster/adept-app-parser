/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */

import {sendImage} from "../utils";

function run(message, params) {
    return getImage().then(img => {
        message.react("✅");
        return sendImage(message, img, "Here's your random image: !" + img.command);
    });
}

module.exports = {
    name: "random",
    run: run
};