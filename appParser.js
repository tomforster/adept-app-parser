function AppInfo() {
    this.name = "";
    this.email = "";
    this.age = "";
    this.location = "";
    this.timediff = "";
    this.vouch = "";
    this.refer = "";
    this.alts = "";
    this.timeInWow = "";
    this.guildHistory = "";

    this.charname = "";
    this.charclass = "";
    this.armoryurl = "";

    this.teams = ""; //not useful

    this.hardcore = false; //no need to add to db
    this.social = false; //no need to add to db

    this.differentCharHC = false; //no need to add to db

    this.charnameHC = "";
    this.charclassHC = "";
    this.specsHC = ""; //no need to add to db
    this.armoryurlHC = "";
    this.mainSpecsHC = [];
    this.offSpecsHC = [];
    this.masteryHC = "";
    this.classHC = "";
    this.uiHC = "";
    this.motivationHC = "";
    this.logsUrlHC = "";

    this.differentCharSC = false; //no need to add to db

    this.charnameSC = "";
    this.charclassSC = "";
    this.specsSC = ""; //no need to add to db
    this.armoryurlSC = "";
    this.mainSpecsSC = [];
    this.offSpecsSC = [];
    this.favouriteContentSC = "";
    this.classSC = "";
    this.addonsSC = "";
    this.learningSC = "";

    this.legion = "";
    this.otherGames = "";
    this.whyAccept = "";
    this.net = "";

    this.wol = ""; //no need to add to db
}

exports.parseText = function(text) {
  return parseText(text);
};

var parseText = function (text) {
    var appInfo = new AppInfo;
    var matched;
    var currentState = "";
    var section = 0;
    var splitText = text.split("\n");
    for (var i = 0; i < splitText.length; i++) {
        matched = false;
        var line = splitText[i].trim();
        for (var j in questions) {
            if (questions.hasOwnProperty(j)) {
                if (line === questions[j].text) {
                    if(section === "sc" && j === "specsHC"){
                        currentState = "specsSC"
                    }else{
                        currentState = j;
                    }
                    matched = true;
                    break;
                }
            }
        }
        if (matched) continue;
        for (j in titles) {
            if (titles.hasOwnProperty(j)) {
                if (line === titles[j]) {
                    section = j;
                    if (section === "hc") {
                        appInfo.hardcore = true;
                    } else if (section === "sc") {
                        appInfo.social = true;
                    }
                    matched = true;
                    break;
                }
            }
        }
        if (matched) continue;

        switch (currentState) {
            case "charname":
                if (section === "hc") {
                    currentState = "charnameHC";
                } else if (section === "sc") {
                    currentState = "charnameSC";
                }
                break;
            case "charclass":
                if (section === "hc") {
                    currentState = "charclassHC";
                } else if (section === "sc") {
                    currentState = "charclassSC";
                }
                break;
            case "armoryurl":
                if (section === "hc") {
                    currentState = "armoryurlHC";
                } else if (section === "sc") {
                    currentState = "armoryurlSC";
                }
                break;
            case "specsHC":
                line = line.replace(" DPS", "");
                if (line.indexOf('Off spec') !== -1) {
                    appInfo.offSpecsHC[appInfo.offSpecsHC.length] = specTranslate(line);
                }
                else if (line.indexOf('Main spec') !== -1) {
                    appInfo.mainSpecsHC[appInfo.mainSpecsHC.length] = specTranslate(line);
                }
                continue;
            case "specsSC":
                line = line.replace(" DPS", "");
                if (line.indexOf('Off spec') !== -1) {
                    appInfo.offSpecsSC[appInfo.offSpecsSC.length] = specTranslate(line);
                }
                else if (line.indexOf('Main spec') !== -1) {
                    appInfo.mainSpecsSC[appInfo.mainSpecsSC.length] = specTranslate(line);
                }
                continue;
            case "differentCharHC":
                if (line === "No") {
                    appInfo.differentCharHC = true;
                }
                continue;
            case "differentCharSC":
                if (line === "No, a different character") {
                    appInfo.differentCharSC = true;
                }
                continue;
            default:
                break;
        }
        appInfo[currentState] += line + '\n';
    }
    
    appInfo.teams = buildTeamString(appInfo);
    appInfo.specsHC = buildRolesString(appInfo,true);
    appInfo.specsSC = buildRolesString(appInfo,false,true);
    appInfo.wol = buildWOLString(appInfo);

    return ({title: buildTitle(appInfo), body: buildForm(appInfo), raw:appInfo});
};

function buildTeamString(appInfo) {
    var teamString = "";
    teamString += appInfo.hardcore ? "Hardcore Raid Team\n" : "";
    teamString += appInfo.social ? "Social Raid Team\n" : "";
    return teamString.substr(0, teamString.length - 1);
}

function buildRolesString(appInfo, hc, sc) {
    var rolesString = "";
    if (hc) {
        rolesString += "Main Spec(s): ";
        rolesString += appInfo.mainSpecsHC.join(', ').replace('H', 'Healer').replace('T', 'Tank').replace('R', 'Ranged').replace('M', 'Melee');
        rolesString += "\n";
        if (appInfo.offSpecsHC.length > 0) {
            rolesString += "Off Spec(s): ";
            rolesString += appInfo.offSpecsHC.join(', ').replace('H', 'Healer').replace('T', 'Tank').replace('R', 'Ranged').replace('M', 'Melee');
            rolesString += "\n";
        }
    } else if (sc) {
        rolesString += "Main Spec(s): ";
        rolesString += appInfo.mainSpecsSC.join(', ').replace('H', 'Healer').replace('T', 'Tank').replace('R', 'Ranged').replace('M', 'Melee');
        rolesString += "\n";
        if (appInfo.offSpecsSC.length > 0) {
            rolesString += "Off Spec(s): ";
            rolesString += appInfo.offSpecsSC.join(', ').replace('H', 'Healer').replace('T', 'Tank').replace('R', 'Ranged').replace('M', 'Melee');
            rolesString += "\n";
        }
    }
    return rolesString;
}

function buildWOLString(appInfo) {
    var wolString = "";
    var server = "";
    if (appInfo.differentCharHC) {
        server = appInfo.armoryurlHC.substr(appInfo.armoryurlHC.indexOf("character/") + 10, appInfo.armoryurlHC.length);
        server = server.substr(0, server.indexOf('/'));
        wolString += "https://www.warcraftlogs.com/rankings/character_name/";
        wolString += appInfo.charnameHC.substr(0, appInfo.charnameHC.length - 1);
        wolString += '/';
        wolString += server;
        wolString += '/EU#boss=0';
    } else if (appInfo.hardcore) {
        server = appInfo.armoryurl.substr(appInfo.armoryurl.indexOf("character/") + 10, appInfo.armoryurl.length);
        server = server.substr(0, server.indexOf('/'));
        wolString += "https://www.warcraftlogs.com/rankings/character_name/";
        wolString += appInfo.charname.substr(0, appInfo.charname.length - 1);
        wolString += '/';
        wolString += server;
        wolString += '/EU#boss=0';
    }
    return wolString;
}

function specTranslate(line) {
    line = line.replace(' - Main spec', '');
    line = line.replace(' - Off spec', '');
    line = line.replace(' - Main Spec', '');
    line = line.replace(' - Off Spec', '');
    line = line.replace('Tank', 'T');
    line = line.replace('Ranged', 'R');
    line = line.replace('Heal', 'H');
    line = line.replace('Melee', 'M');
    return line;
}

function buildTitle(appInfo) {
    var title = "";
    if (appInfo.social && appInfo.hardcore) {
        title += "Hardcore/Social Raiding: " + appInfo.charname.trim() + " [";
        title += appInfo.differentCharHC ? appInfo.charclassHC.trim() : appInfo.charclass.trim();
        title += " MS:" + appInfo.mainSpecsHC.join('/') + " OS:" + appInfo.offSpecsHC.join('/') + "]";
        title += appInfo.differentCharSC ? "*" : "";
    }
    else if (appInfo.hardcore) {
        title += "Hardcore Raiding: " + appInfo.charname.trim() + " [";
        title += appInfo.differentCharHC ? appInfo.charclassHC.trim() : appInfo.charclass.trim();
        title += " MS:" + appInfo.mainSpecsHC.join('/');
        if (appInfo.offSpecsHC.length > 0) {
            title += " OS:" + appInfo.offSpecsHC.join('/');
        }
        title += "]";
    }
    else if (appInfo.social) {
        title += "Social Raiding: " + appInfo.charname.trim() + " [";
        title += appInfo.differentCharSC ? appInfo.charclassSC.trim() : appInfo.charclass.trim();
        title += " MS:" + appInfo.mainSpecsSC.join('/');
        if (appInfo.offSpecsSC.length > 0) {
            title += " OS:" + appInfo.offSpecsSC.join('/')
        }
        title += "]";
    }
    else {
        title += "Social: " + appInfo.charname.trim() + " [" + appInfo.charclass.trim() + "]";
    }
    return title;
}

function buildForm(appInfo) {
    var gen = new QAGenerator(appInfo);

    var form = "";
    form += gen.sectionTitle("personal");

    form += gen.questionAndAnswer("name");
    form += gen.questionAndAnswer("age");
    form += gen.questionAndAnswer("location");
    form += gen.questionAndAnswer("timediff");
    form += gen.questionAndAnswer("vouch");
    form += gen.questionAndAnswer("refer");
    form += "\n";

    form += gen.sectionTitle("character");
    form += gen.questionAndAnswer("charname");
    form += gen.questionAndAnswer("charclass");
    form += gen.questionAndAnswer("armoryurl");
    form += gen.questionAndAnswer("alts");
    form += gen.questionAndAnswer("timeInWow");
    form += gen.questionAndAnswer("guildHistory");
    form += gen.questionAndAnswer("teams");
    form += "\n";

    if (appInfo.hardcore) {
        form += "\n";
        form += gen.sectionTitle("hc");
        form += gen.questionAndAnswer("differentCharHC");
        if (appInfo.differentCharHC) {
            form += gen.questionAndAnswer("charnameHC");
            form += gen.questionAndAnswer("armoryurlHC");
        }
        form += gen.questionAndAnswer("specsHC");
        form += gen.questionAndAnswer("masteryHC");
        form += gen.questionAndAnswer("classHC");
        form += gen.questionAndAnswer("uiHC");
        form += gen.questionAndAnswer("motivationHC");
        form += gen.questionAndAnswer("logsUrlHC");
    }
    if (appInfo.social) {
        form += "\n";
        form += gen.sectionTitle("sc");
        form += gen.questionAndAnswer("differentCharSC");
        if (appInfo.differentCharSC) {
            form += gen.questionAndAnswer("charnameSC");
            form += gen.questionAndAnswer("armoryurlSC");
        }
        form += gen.questionAndAnswer("specsSC");
        form += gen.questionAndAnswer("favouriteContentSC");
        form += gen.questionAndAnswer("classSC");
        form += gen.questionAndAnswer("addonsSC");
        form += gen.questionAndAnswer("learningSC");
    }
    form += "\n";
    form += gen.sectionTitle("gaming");
    form += gen.questionAndAnswer("legion");
    form += gen.questionAndAnswer("net");
    form += gen.questionAndAnswer("otherGames");
    form += gen.questionAndAnswer("whyAccept");
    if (appInfo.hardcore) {
        form += gen.sectionTitle("appbot");
        form += gen.questionAndAnswer("wol");
    }

    return form;
}

function QAGenerator(appInfo) {

    this.questionAndAnswer = function(field){
        q = questions[field];
        a = appInfo[field];
        if(q.isBoolean && !q.flipBoolean){
            a = a ? "Yes" : "No";
        }else if(q.isBoolean && q.flipBoolean){
            a = a ? "No" : "Yes";
        }
        if (q.text === "") return "";
        if (q.isSpaced) {
            return "\n[b]" + q.text + "[/b]\n" + a;
        } else {
            return "[b]" + q.text + "[/b]\n" + a;
        }
    }

    this.sectionTitle = function(field) {
        return "[b][i][size=150]" + titles[field] + "[/size][/i][/b]\n\n";
    }
}


function Question(name, isSpaced, isBoolean, flipBoolean) {
    this.text = name;
    this.isSpaced = isSpaced;
	if(isBoolean == undefined)
		isBoolean = false;
    this.isBoolean = isBoolean;
	if(flipBoolean == undefined)
		flipBoolean = false;
    this.flipBoolean = flipBoolean;
}

var questions = {
    "name": new Question("What should we call you?", false),
    "email": new Question("Email", false),
    "age": new Question("Age", false),
    "location": new Question("Location", false),
    "timediff": new Question("Difference in time to server", false),
    "vouch": new Question("Do you know anyone in Adept? If so, who?", false),
    "charname": new Question("Character name", false),
    "charclass": new Question("Class", false),
    "armoryurl": new Question("Armory link", false),
    "refer": new Question("How did you hear about us?", false),
    "alts": new Question("Any alts to tell us about?", true),
    "timeInWow": new Question("What do you usually spend your WoW time doing?", true),
    "guildHistory": new Question("What were your last 3 Guilds and why did you leave them?", true),
    "teams": new Question("Are you applying for any of our teams?", true),
    "differentCharHC": new Question("Are you applying to raid on the same character given above?", false, true, true),
    "specsHC": new Question("What role(s) are you applying for?", true),
    "masteryHC": new Question("Give an example of when you have mastered a raid encounter that challenged you and how you overcame that challenge", true),
    "classHC": new Question("What class knowledge do you have that helps you to get the most out of your character?", true),
    "uiHC": new Question("How do you configure your UI to enable you to perform to a high standard?", true),
    "motivationHC": new Question("What is your primary motivation to raid?", true),
    "logsUrlHC": new Question("Do you have any logs we can look at?", true),
    "differentCharSC": new Question("Are you applying to raid socially on the same character given at the start?", false, true, true),
    "specsSC": new Question("What role(s) are you applying for?", true),
    "favouriteContentSC": new Question("What is your favourite piece of PVE content in WoW and why?", true),
    "classSC": new Question("Why did you choose your class? What do you like most about it?", true),
    "addonsSC": new Question("What addons do you use and why do you like them?", true),
    "learningSC": new Question("How do you prefer learning tactics best (i.e. videos, descriptions, trying and wiping)?", true),
    "legion": new Question("What do you like most about Legion?", false),
    "net": new Question("What's your internet connection like?",true),
    "otherGames": new Question("Do you play any other games or have any other hobbies? What do you like about them?", true),
    "whyAccept": new Question("Why should we accept your application?", true),
    "wol": new Question("World of Logs")
};

var titles = {
    personal: "Personal Information",
    character: "Character Information",
    hc: "Hardcore Raiding",
    sc: "Social Raiding",
    gaming: "Gaming Information",
    appbot: "AppBot links"
};
