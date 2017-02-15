/**
 * Created by Tom on 15/02/2017.
 */

const path = require("path");
const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, '../../config/config.json'))[env];

function run(message, params) {
    if (config.auditUrl) return message.reply("<" + config.auditUrl + ">");
    return Promise.resolve();
}

module.exports = {
    names: ["audit"],
    description: "Displays a link to the Red Squad audit spreadsheet.",
    run
};