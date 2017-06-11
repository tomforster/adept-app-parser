/**
 * Created by Tom on 15/02/2017.
 */

const config = require('../../config');

function run(message, params) {
    if (config.auditUrls && config.auditUrls.length > 0){
        let results = auditUrls.filter(auditUrl => (auditUrl.keyword.toLowerCase() === params[0]) ||
        ((auditUrl.keyword.toLowerCase()+'s') === params[0]));
        if(results.length > 0){
            return message.reply("<" + results[0].url + ">");
        }else{
            return config.auditUrls[0];
        }
    }
    return Promise.resolve();
}

module.exports = {
    names: ["audit"],
    description: "Displays a link to the Red Squad audit spreadsheet.",
    run
};