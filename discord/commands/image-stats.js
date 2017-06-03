/**
 * Created by Tom on 03/06/2017.
 */

const voteRepository = require("../../repositories/voteRepository");

function run(message) {
    let highestAvg = voteRepository.getUsersWithHighestAverageScore(3);
    let lowestAvg = voteRepository.getUsersWithLowestAverageScore(3);
    let highestTotal = voteRepository.getUsersWithHighestScore(3);
    let lowestTotal = voteRepository.getUsersWithLowestScore(3);

    let output = "";
    if(highestAvg && highestAvg.length > 0){
        output += "**Top 3 users by image score:**\n";
        highestAvg.forEach((user, index) => {
            output += index + ": " + user.username + " [" + user.total + "]\n"
        });
        output += "\n";
    }
    if(lowestAvg && lowestAvg.length > 0){
        output += "**Bottom 3 users by image score:**\n";
        lowestAvg.forEach((user, index) => {
            output += index + ": " + user.username + " [" + user.total + "]\n"
        });
        output += "\n";
    }
    if(highestTotal && highestTotal.length > 0){
        output += "**Top 3 users by average image score:**\n";
        highestTotal.forEach((user, index) => {
            output += index + ": " + user.username + " [" + (Math.round(user.total * 100) / 100) + "]\n"
        });
        output += "\n";
    }
    if(lowestTotal && lowestTotal.length > 0){
        output += "**Bottom 3 users by average image score:**\n";
        lowestTotal.forEach((user, index) => {
            output += index + ": " + user.username + " [" + (Math.round(user.total * 100) / 100) + "]\n"
        });
        output += "\n";
    }

    return message.channel.sendMessage("```css\n" + output + "```");
}

module.exports = {
    names: ["image-stats"],
    description: "Some stats about the top saved images.",
    run
};