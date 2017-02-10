/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */

function run(message, params) {
    if (params.length > 0) {
        if (!isNaN(params[0])) {
            let upperBound = +params[0];//converts string to float
            if (upperBound % 1 === 0 && upperBound < Number.MAX_VALUE && upperBound > 0) { //is this an int
                return message.reply("you rolled " + Math.ceil(Math.random() * upperBound) + " (1 - " + upperBound + ")");
            }
        }
    }
    return message.reply("you rolled " + Math.ceil(Math.random() * 6) + " (1 - " + 6 + ")").catch(error => log.error(error));
}

module.exports = {
    names: ["roll"],
    description: "Performs a random dice roll.",
    run
};