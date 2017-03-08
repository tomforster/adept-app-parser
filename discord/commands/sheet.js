/**
 * @author Tom Forster
 *         Date: 10/02/2017
 */

const config = require('../../config');

function run(message, params) {
    if (config.sheetUrl) return message.reply("<" + config.sheetUrl + ">");
    return Promise.resolve();
}

module.exports = {
    names: ["sheet"],
    description: "Displays a link to the Red Squad spreadsheet.",
    run
};