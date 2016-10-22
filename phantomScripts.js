var env = process.env.NODE_ENV || "development";
var path = require('path');
var config = require(path.join(__dirname,'config/config.json'))[env];
var phantom = require('phantom');
const log = require('better-logs')('headless');

var postApp = function(mailObj){
    log.info('Posting Adept App');
    var username = config.forumUsername;
    var password = config.forumPassword;
    return new Promise(function(fulfill,reject) {
        var _ph, _page;
        phantom.create(['--load-images=no']).then(function(ph){
            _ph = ph;
            return _ph.createPage();
        }).then(function(page) {
            _page = page;
            return _page.open(config.forumUrl);
        }).then(function(status) {
            log.info("opened page? status: ", status);
            if (status.indexOf('success') == -1) {
                reject('Did not load');
                log.error("Failed to load page");
                _ph.exit();
            }
            log.info("logging in as " + username + "...");
            _page.evaluate(function (mailObj, username, password) {
                var usernameElement = document.querySelector('#username');
                if (!usernameElement) {
                    return false;
                }
                usernameElement.value = username;
                document.querySelector('#password').value = password;
                document.querySelector('.button1[name=login]').click();
                return true;
            },mailObj, username, password)
                .then( function(result) {
                if (!result) {
                    log.info('No username detected');
                    _ph.exit();
                    reject();
                    return;
                }
                log.info("waiting for load...");
                setTimeout(function () {
                    log.info("finished waiting, posting app:");
                    _page.evaluate(function (mailObj) {
                        document.querySelector('#subject').value = mailObj.title;
                        document.querySelector('#message').value = mailObj.body;
                        document.querySelector('.default-submit-action[name=post]').click();
                    }, mailObj)
                    .then(function () {
                        setTimeout(function () {
                            _page.evaluate(function () {
                                return document.URL.split('&sid')[0]
                            }).then(function (url) {
                                if (url.indexOf('t=') > -1) {
                                    log.info('app posted!');
                                    log.info(url);
                                    fulfill(url);
                                } else {
                                    reject();
                                    log.info("Possibly did not upload");
                                }
                                log.info('Exiting');
                                ph.exit();
                            });
                        }, 5000);
                    }, mailObj);
                }, 5000);
            }, mailObj, username, password);
        });
    });
};

var readAudit = function(){
    log.info("Starting audit read");
    return new Promise(function(resolve,reject){
        var auditUrl = "http://www.guildaudit.com/g/9146";
        var _ph, _page;
        
        phantom.create(['--load-images=no']).then(function(ph){
            _ph = ph;
            return _ph.createPage();
        }).then(function(page) {
            _page = page;
            return _page.open(auditUrl);
        }).then(function(status) {
            log.info("opened page? status: ", status);
            if (status.indexOf('success') == -1) {
                reject('Did not load');
                log.error("Failed to load page");
                _ph.exit();
            }
            log.info("Reading data");
            _page.evaluate(function () {
                var auditData = {characterData:[], lastCheck:""};
                var names = $(".characterRow .nameLink").map(function (index, value) {
                    return $(value).text()
                });
                var ilvls = $(".characterRow .iLvl").map(function (index, value) {
                    return $(value).text()
                });
                var upgradesPC = $(".characterRow .upgradesNumber").map(function (index, value) {
                    return $(value).text()
                });
                var auditInfo = $(".characterRow .audit").map(function (index, value) {
                    return $(value).text()
                });
                for (var i = 0; i < names.length; i++) {
                    auditData.characterData.push({name: names[i], ilvl: ilvls[i], upgrades: upgradesPC[i], audit: auditInfo[i]});
                }
                var lastCheck = $(".groupLastChecked").text();
                auditData.lastCheck = lastCheck.split(': ').pop();
                return auditData;
            }).then(function (auditData) {
                log.info("Got audit data");
                resolve(auditData);
                _ph.exit();
            });
        });
    });
};

module.exports = {
    postApp: postApp,
    readAudit: readAudit
};