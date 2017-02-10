/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */
const utils = require("../utils");

function run(message, params, keyword){
    if(keyword && typeof keyword === 'string' && keyword.length > 0){
        return utils.getImage(keyword.toLowerCase()).then(img => {
            message.react("✅");
            return utils.sendImage(message, img)
        });
    }
}

module.exports = {
    name:'default',
    run
};