/**
 * @author Tom Forster
 *         Date: 10/02/2017
 */
const utils = require("../utils");

function run(message, params, keyword){
    if(keyword && typeof keyword === 'string' && keyword.length > 0){
        return utils.getImage(keyword.toLowerCase()).then(img => {
            return utils.sendImage(message, img, img.comment).then(message => {message.__imageId = img.id; return message});
        });
    }
    return Promise.resolve();
}

module.exports = {
    names: [],
    isDefault: true,
    run
};