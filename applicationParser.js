const log = require('bristol');

class Applicant {

    constructor(sections){
        this.data = sections;
    };

    getSection(name){
        return this.data.find(section => section.label.toLowerCase().indexOf(name) >= 0);
    }

    findQuestion(section, text){
        return section.questions.find(question => question.label.toLowerCase().indexOf(text.toLowerCase()) >= 0)
    }

    getCharacter(){
        let name, charClass, roles = [], section, armouryLink;

        section = this.getSection("character information");
        name = this.findQuestion(section, "character name").answer;
        charClass = this.findQuestion(section, "class").answer;
        armouryLink = this.findQuestion(section, "armory link").answer;

        let hardcoreSection = this.getSection("hardcore");
        let socialSection = this.getSection("social");
        if (section = hardcoreSection || socialSection) {
            let sameAsAboveQuestion = this.findQuestion(section, "Are you applying to raid on the same character given above");
            if (sameAsAboveQuestion && sameAsAboveQuestion.answer === "No") {
                name = this.findQuestion(section, "character name").answer;
                charClass = this.findQuestion(section, "class").answer;
                armouryLink = this.findQuestion(section, "armory link").answer;
            }
            roles = this.findQuestion(section, "role").answer;
        }

        return {
            name: name,
            class: charClass,
            roles: roles.map(line => {
                let role = {isMainSpec: false, type: ''};
                if (line.toLowerCase().indexOf("main") >= 0) {
                    role.isMainSpec = true;
                }
                if (line.toLowerCase().indexOf("tank") >= 0) {
                    role.type = 'T';
                } else if (line.toLowerCase().indexOf("ranged") >= 0) {
                    role.type = 'R';
                } else if (line.toLowerCase().indexOf("heal") >= 0) {
                    role.type = 'H';
                } else if (line.toLowerCase().indexOf("melee") >= 0) {
                    role.type = 'M';
                }
                return role;
            }),
            isHardcore: !!hardcoreSection,
            isSocial: !!socialSection,
            armouryLink: armouryLink
        };

    };
}

module.exports.process = function(sections){
    let application = new Applicant(sections);
    let character = application.getCharacter();
    let bbCode = "";

    sections.forEach(section => {
        bbCode += '[b][i][size=150]' + section.label + '[/size][/i][/b]\n\n';
        section.questions.forEach(question => {
            //dont display emails
            if(question.label.toLowerCase().indexOf("mail") >= 0) {
                return;
            }
            bbCode += '[b]' + question.label + '[/b]\n';
            if(Array.isArray(question.answer)){
                question.answer.forEach(answer => {
                    bbCode += answer + '\n';
                })
            }else {
                bbCode += question.answer + '\n';
            }
        });
        bbCode += '\n';
    });

    if(character.isSocial || character.isHardcore) {
        bbCode += '[b][i][size=150]Appbot Links[/size][/i][/b]\n\n';
        bbCode += '[b]Warcraft Logs[/b]\n';
        bbCode += getWCLString(character);
    }
    return {title: getTitle(character), body: bbCode, character:character};
};

function getWCLString(character) {
        let url = character.armouryLink;
        let match = url.match(/.*\/character\/(.*)\/(.*)\//);
        if(match && match.length === 3){
            let server = match[1];
            let name = match[2];
            return `https://www.warcraftlogs.com/rankings/character_name/${name}/${server}/EU#boss=0`;
        }
        return "";
}

function getTitle(char){
    let type = "Social", roles = [];
    if (char.isHardcore) {
        type = "Red Squad";
    } else if (char.isSocial) {
        type = "Viper Squad";
    }
    if(char.roles.length > 0){
        let msRoles = char.roles.filter(role => role.isMainSpec);
        let osRoles = char.roles.filter(role => !role.isMainSpec);
        if(msRoles.length > 0){
            roles.push("MS:" + msRoles.map(role => role.type).join(','))
        }
        if(osRoles.length > 0){
            roles.push("OS:" + osRoles.map(role => role.type).join(','))
        }
        if(roles.length > 0){
            roles = [''].concat(roles);
        }
    }
    return `${type}: ${char.name} [${char.class.trim()}${roles.join(' ')}]`;
}
