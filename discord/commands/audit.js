/**
 * Created by Tom on 15/02/2017.
 */

const config = require('../../config');

function run(message, params) {
    if (config.auditUrl) return message.reply("<" + config.auditUrl + ">");
    return Promise.resolve();
}

module.exports = {
    names: ["audit"],
    description: "Displays a link to the Red Squad audit spreadsheet.",
    run
};