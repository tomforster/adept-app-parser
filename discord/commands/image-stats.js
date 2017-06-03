/**
 * Created by Tom on 03/06/2017.
 */

const voteRepository = require("../../repositories/voteRepository");

function run(message) {
    const highestAvgPromise = voteRepository.getUsersWithHighestAverageScore(3);
    const lowestAvgPromise = voteRepository.getUsersWithLowestAverageScore(3);
    const highestTotalPromise = voteRepository.getUsersWithHighestScore(3);
    const lowestTotalPromise = voteRepository.getUsersWithLowestScore(3);

    return Promise.all([highestAvgPromise, lowestAvgPromise, highestTotalPromise, lowestTotalPromise]).then(result =>
    {
        if(!result || result.length !== 4) return;
        const highestAvg = result[0];
        const lowestAvg = result[1];
        const highestTotal = result[2];
        const lowestTotal = result[3];

        let output = "";
        if(highestTotal && highestTotal.length > 0){
            output += "**Top 3 users by image score:**\n";
            highestTotal.forEach((user, index) => {
                output += (index+1) + ": " + user.username + " [" + user.total + "]\n"
            });
            output += "\n";
        }
        if(lowestTotal && lowestTotal.length > 0){
            output += "**Bottom 3 users by image score:**\n";
            lowestTotal.forEach((user, index) => {
                output += (index+1) + ": " + user.username + " [" + user.total + "]\n"
            });
            output += "\n";
        }
        if(highestAvg && highestAvg.length > 0){
            output += "**Top 3 users by average image score:**\n";
            highestAvg.forEach((user, index) => {
                output += (index+1) + ": " + user.username + " [" + (Math.round(user.average * 100) / 100) + "]\n"
            });
            output += "\n";
        }
        if(lowestAvg && lowestAvg.length > 0){
            output += "**Bottom 3 users by average image score:**\n";
            lowestAvg.forEach((user, index) => {
                output += (index+1) + ": " + user.username + " [" + (Math.round(user.average * 100) / 100) + "]\n"
            });
            output += "\n";
        }

        return message.channel.sendMessage("```css\n" + output + "```");
    })
}

module.exports = {
    names: ["imagestats"],
    description: "Some stats about the top saved images.",
    run
};