/**
 * Created by Tom on 10/02/2017.
 */

function run(message, params) {
    let opMessage = "";
    // if(params.length !== 1) {
        opMessage = "Available command list:\n\n";
        const commands = require('../utils').commands;
        Object.keys(commands).forEach(key => {
            let command = commands[key];
            if (command.names.length > 0) {
                opMessage += `    **!${command.names.join('/!')}**: ${command.description}\n`
            }
        });
        // opMessage += '\n\n Type !help <command> for usage information';
    // } else {
    //     let keyword = params[0];
    //
    //     let command, commandIndex = Object.keys(commands).find(commandKey => commands[commandKey].names.indexOf(keyword) >= 0);
    //     if(!commandIndex){
    //         return Promise.resolve();
    //     }else{
    //         command = commands[commandIndex];
    //     }
    //
    //     opMessage += `Usage information for ${keyword}:\n\n   ${command.help}`;
    // }
    return message.channel.sendMessage(opMessage);
}

module.exports = {
    names: ["commands", "help"],
    description: "Displays a list of available commands.",
    run
};