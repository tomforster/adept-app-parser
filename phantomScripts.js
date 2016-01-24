var env = process.env.NODE_ENV || "development";
var path = require('path');
var config = require(path.join(__dirname,'config/config.json'))[env];
var phantom = require('phantom');

postApp = function(mailObj){
    console.log('Posting Adept App');
    var username = config.forumUsername;
    var password = config.forumPassword;

    phantom.create(function (ph) {
        ph.createPage(function (page) {
            page.open("http://www.adept-draenor.org/board/posting.php?mode=post&f=30", function (status) {
                console.log("opened page? status: ", status);

                //todo retry on bad status
                if (status.indexOf('success') == -1) {
                    console.log("exiting");
                    ph.exit();
                }

                page.evaluate(function (mailObj,username,password) {
                    console.log("logging in...");
                    var usernameElement = document.querySelector('#username');
                    if(!usernameElement){
                        return;
                    }
                    usernameElement.value = username;
                    document.querySelector('#password').value = password;
                    document.querySelector('.button1').click();
                    return mailObj;
                }, function (mailObj) {
                    console.log(mailObj.title);
                    if(!mailObj){
                        console.log('No username detected');
                        ph.exit();
                    }
                    setTimeout(function(){
                        page.evaluate(function(mailObj) {
                            console.log("posting app...");
                            document.querySelector('#subject').value = mailObj.title;
                            document.querySelector('#message').value = mailObj.body;
                            document.querySelector('.default-submit-action').click();
                        }, function(){
                            setTimeout(function() {
                                page.evaluate(function() { return document.URL},function(url) {
                                    if(url.indexOf('t=') > -1){
                                        console.log('app posted!');
                                        console.log(url);
                                        discordBot.newAppMessage(mailObj.title,url);
                                    }else{
                                        console.log("Possibly did not upload");
                                    }
                                    console.log('Exiting');
                                    ph.exit();
                                });
                            },10000);
                        },mailObj);
                    },10000);
                },mailObj);
            });
        });
    });
};

readAudit = function(){
    return new Promise(function(resolve,reject){
        var auditUrl = "http://www.guildaudit.com/g/9146";
        phantom.create(function (ph) {
            ph.createPage(function (page) {
                page.open(auditUrl, function (status) {
                    console.log("opened page? ", status);
                    if (status.indexOf('success') == -1) {
                        reject('Did not load');
                        ph.exit();
                    }
                    console.log('1');
                    page.evaluate(function () {
                        console.log('2');
                        var characterData = [];
                        var names = $(".characterRow .nameLink").map(function(index,value){return $(value).text()});
                        console.log("name"+names);
                        var ilvls = $(".characterRow .iLvl").map(function(index,value){return $(value).text()});
                        var upgradesPC = $(".characterRow .upgradesNumber").map(function(index,value){return $(value).text()});
                        var auditInfo = $(".characterRow .audit").map(function(index,value){return $(value).text()});
                        for(var i = 0; i < names.length; i++){
                            characterData.push({name:names[i],ilvl:ilvls[i],upgrades:upgradesPC[i],audit:auditInfo[i]});
                        }
                        return characterData;
                    }, function (characterData) {
                        resolve(characterData);
                        ph.exit();
                    });
                });
            });
        });
    });
};

module.exports = {
    postApp: postApp,
    readAudit: readAudit
};