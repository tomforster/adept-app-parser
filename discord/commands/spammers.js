/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */

const humanizeDuration = require('humanize-duration');
const parseDuration = require('parse-duration');
const auditRepository = require('../../repositories/auditRepository');

function run(message, params) {
    let duration = parseDuration(params.join(' '));
    if (params.filter(param => param.toLowerCase() === 'all').length > 0 && message.server) {
        return auditRepository.top10UsersForServerByMessageCountWithDuplicateDetection(message.server.channels.map(channel => channel.id), duration).then(result => {
            if (result && result.length > 0) {
                let opMessage = `Top 10 most active users in the server #${message.server.name} for `;
                opMessage += duration > 0 ? ("the last " + humanizeDuration(duration) + ":\n") : "all time:\n";
                result.forEach(messageCount => opMessage += "\n" + messageCount.username + ": " + messageCount.count);
                return message.channel.sendMessage(opMessage);
            } else if (result.length == 0) {
                return message.channel.sendMessage("No eligible messages found.");
            }
        })
    } else {
        return auditRepository.top10UsersForChannelByMessageCountWithDuplicateDetection(message.channel.id, duration).then(result => {
            if (result && result.length > 0) {
                let opMessage = `Top 10 most active users in the channel #${message.channel.name} for `;
                opMessage += duration > 0 ? ("the last " + humanizeDuration(duration) + ":\n") : "all time:\n";
                result.forEach(messageCount => opMessage += "\n" + messageCount.username + ": " + messageCount.count);
                return message.channel.sendMessage(opMessage);
            } else if (result.length == 0) {
                return message.channel.sendMessage("No eligible messages found.");
            }
        })
    }
}

module.exports = {
    name: "spammers",
    run: run
};