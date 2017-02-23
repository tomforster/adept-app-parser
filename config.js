/**
 * Created by Tom on 23/02/2017.
 */

const path = require('path');
const env = process.env.NODE_ENV || "development";
module.exports = require(path.join(__dirname,'config/config.json'))[env];