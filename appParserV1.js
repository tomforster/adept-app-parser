function PlayerInfo(){
	this.name = "";
	this.social = false;
	this.hardcore = false;
	this.mainspecs = [];
	this.offspecs = [];
	this.classname = "";
	this.charname = "";
	this.server = "";
}

exports.parseText = function(text){
//var parseText = function(text){
	var playerInfo = new PlayerInfo();
	var title = "";
	var social = false;
	var hardcore = false;
	var addNL = false;
	var delNext = false;
	var saveNext = true;
	var saveNextToTitle = false;
	var saveNextTo = {};
	var saved = "";
	var offspecs = [];
	var mainspecs = [];
	classname = "";
	opline = "[b][i][size=150]Personal Information[/size][/i][/b]\n\n";
	var splitText = text.split("\n");
	for(var i = 0; i < splitText.length; i++){
		var line = splitText[i].trim();
		for(var j = 0; j < simpleMatches.length; j++){
			if(line === simpleMatches[j]){
				saveNext = false;
				delNext = false;
				saveNextToTitle = false;
				if(line === "Email" || line === "Forum username"){
					delNext = true;
				}
				if(line === "Character name"){
					saveNext = true;
				}
				if(line === "Class"){
					saveNextToTitle = true;
				}
				line = "[b]"+line+"[/b]";
				if(addNL){
					addNL = false;
					line = "\n"+line;
				}
				break;
			}
		}
		for(var j = 0; j < questionMatches.length; j++){
			if(line === questionMatches[j]){
				delNext = false;
				saveNext = false;
				saveNextToTitle = false;
				if(line === "What role(s) are you applying for?"){
				saveNextToTitle = true;
				}
				//if(line === "Are you applying for any of our teams?"){
				//	i++;
				//}
				line = "[b]"+line+"[/b]";
				if(addNL){
					addNL = false;
					line = "\n"+line;
				}
				addNL = true;
				break;
			}
		}
		for(var j = 0; j < titleMatches.length; j++){			
			if(line === titleMatches[j]){
				saveNext = false;
				saveNextToTitle = false;
				if(line === "Social Raiding"){
					social = true;
				}
				else if(line === "Hardcore Raiding"){
					hardcore = true;
				}
				delNext = false;
				line = "\n[b][i][size=150]"+line+"[/size][/i][/b]\n";
				addNL = false;
				break;
			}
		}
		if(line.substr(0,2) === " \t"){
			line = line.substr(2);
		}
		if(saveNext){
			saved = line;
		}
		if(saveNextToTitle){
			if(line === "[b]Class[/b]"){
				//do nothing
			}else if(line === "\n[b]What role(s) are you applying for?[/b]"){
				//do nothing
			}else{
				line = line.replace(' DPS','');
				line = line.trim();
				if(line.indexOf('Off spec') !== -1){
					line = line.replace(' - Off spec','');
					offspecs[offspecs.length]=line;
				}
				else if(line.indexOf('Main spec') !== -1){
					line = line.replace(' - Main spec','');
					mainspecs[mainspecs.length]=line;
				}else if(line !== ''){
					classname = line;
				}
			}
		}
		if(delNext){
			continue;
		}
		opline += line+"\n";
	}
	if(social && hardcore){
		title += "Hardcore/Social Raiding: "+saved;
	}
	else if(hardcore){
		title += "Hardcore Raiding: "+saved;
	}
	else if(social){
		title += "Social Raiding: "+saved;
	}
	else{
		title += "Social: "+saved;
	}
	
		title+=" [";
		title+=classname;
		if(mainspecs.length > 0){
			title+=" ";
			title+=mainspecs.join(', ');
		}
		/*if(offspecs.length > 0) {
			title+=" OS:";
			title+=offspecs.join(',');
		}*/
		title+="]";
		
		opline = opline.substr(0,opline.length-1);
	
	return({title:title,body:opline});
}

var simpleMatches = ["Name",
    "Email",
    "Forum username",
    "Age",
    "Gender",
    "Location",
    "Difference in time to server",
    "Do you know anyone in Adept? If so, who?",
    "Character name",
    "Class",
    "Armory link",
    'How did you hear about us?'];

var questionMatches = ["Any alts to tell us about?",
    "What do you usually spend your WoW time doing?",
    "What were your last 3 Guilds and why did you leave them?",
    "Are you applying for any of our teams?",
    "Are you applying to raid on the same character given above?",
    "What role(s) are you applying for?",
    "Give an example of when you have mastered a raid encounter that challenged you and how you overcame that challenge",
    "What class knowledge do you have that helps you to get the most out of your character?",
    "How do you configure your UI to enable you to perform to a high standard?",
    "What is your primary motivation to raid?",
    "Do you have any logs we can look at?",
    "Are you applying to raid socially on the same character given at the start?",
    "What role(s) are you applying for?",
    "What is your favourite piece of PVE content in WoW and why?",
    "Why did you choose your class? What do you like most about it?",
    "What addons do you use and why do you like them?",
    "How do you prefer learning tactics best (i.e. videos, descriptions, trying and wiping)?",
    "What are you most excited about in Warlords of Draenor?",
    "Do you play any other games or have any other hobbies? What do you like about them?",
    "Why should we accept your application?"];

var titleMatches = ["Gaming Information",
    "Social Raiding",
    "Hardcore Raiding",
    "Character Information"];