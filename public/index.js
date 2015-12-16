/**
 * Created by Tom on 14/08/14.
 */

var app = angular.module('appParser',[]);

app.directive("parser",function(){
    return{
        restrict:'E',
        templateUrl:"partials/parser.html",
        controller:function(){
            var opline = "";
            var self = this;
            this.appText = "";
            this.opText = "";
            this.parseText = function(){
                var title = "";
                var social = false;
                var hardcore = false;
                var addNL = false;
                var delNext = false;
                var saveNext = true;
                var saved = "";
				if(self.appText == ""){
					console.log('clearing');
					self.titleText = "";
					self.opText = "";
					return;
				}
                opline = "[b][i][size=150]Personal Information[/size][/i][/b]\n\n";
                var splitText = self.appText.split("\n");
                for(var i = 0; i < splitText.length; i++){
                    var line = splitText[i];
                    for(var j = 0; j < simpleMatches.length; j++){
                        if(line === simpleMatches[j]){
                            saveNext = false;
                            delNext = false;
                            if(line === "Email" || line === "Forum username"){
                                delNext = true;
                            }
                            if(line === "Character name"){
                                saveNext = true;
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
                            if(line === "What role(s) are you applying for?"){
                                i++;
                            }
                            if(line === "Are you applying for any of our teams?"){
                                i++;
                            }
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
                    if(delNext) continue;
                    opline += line+"\n";
                }
                self.opText = opline;
                if(social && hardcore){
                    title += "Hardcore/Social Raiding Application: "+saved;
                }
                else if(hardcore){
                    title += "Hardcore Raiding Application: "+saved;
                }
                else if(social){
                    title += "Social Raiding Application: "+saved;
                }
                else{
                    title += "Social Application: "+saved;
                }
                self.titleText = title;
            }

        },
        controllerAs:'parser'
    }
});

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
