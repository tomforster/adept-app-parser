/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */

const path = require("path");
const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, '../config/config.json'))[env];

function run(message, params) {
    if (config.sheetUrl) return message.reply("<" + config.sheetUrl + ">");
    return Promise.resolve();
}

module.exports = {
    name: "sheet",
    run
};