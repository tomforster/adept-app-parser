/**
 * @author Tom Forster <tom.forster@mpec.co.uk>
 *         Date: 10/02/2017
 */
const commandRepository = require("../../repositories/imageRepository");

function run(message, params){
    let guildUser = message.guild.members.get(message.author.id);
    if (!guildUser || !guildUser.hasPermission("ADMINISTRATOR")){
        return Promise.resolve();
    }

    if (params.length === 2) {
        let commandParam = params[0].toLowerCase();
        let idParam = params[1];
        if (commandParam && typeof commandParam === 'string' && commandParam.length > 1 && idParam && !isNaN(idParam)) {
            if (commandParam.charAt(0) === '!')
                commandParam = commandParam.slice(1);
            return commandRepository.safeDelete(commandParam, idParam).then((result) => {
                if (result && result > 0) {
                    return message.reply("successfully deleted image for command " + commandParam + ".");
                } else {
                    return message.reply("unable to find any image for command " + commandParam + " with id " + idParam + ".");
                }
            }).catch(() => {
                return message.reply("failed to deleted image for command " + commandParam + ".");
            });
        }
        else {
            return message.reply("please use the following format: !delete <command> <image_id>. Use the !list commmand to find the image id (the values in brackets at the end of each line).");
        }
    }

    return Promise.resolve();
}

module.exports = {
    names: ["delete"],
    description: "Deletes an image for a given command. [Requires Admin Permission]",
    run
};