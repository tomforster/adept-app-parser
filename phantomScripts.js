var env = process.env.NODE_ENV || "development";
var path = require('path');
var config = require(path.join(__dirname,'config/config.json'))[env];
var phantom = require('phantom');
var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({'timestamp':true})
    ]
});

var postApp = function(mailObj){
    logger.info('Posting Adept App');
    var username = config.forumUsername;
    var password = config.forumPassword;
    return new Promise(function(fulfill,reject) {
        var _ph, _page;
        phantom.create().then(function(ph){
            _ph = ph;
            return _ph.createPage();
        }).then(function(page) {
            _page = page;
            return _page.open(config.forumUrl);
        }).then(function(status) {
            logger.info("opened page? status: ", status);
            if (status.indexOf('success') == -1) {
                reject('Did not load');
                logger.error("Failed to load page");
                _ph.exit();
            }
            logger.info("logging in as " + username + "...");
            _page.evaluate(function (mailObj, username, password) {
                var usernameElement = document.querySelector('#username');
                if (!usernameElement) {
                    return false;
                }
                usernameElement.value = username;
                document.querySelector('#password').value = password;
                document.querySelector('.button1[name=login]').click();
                return true;
            }, function (result) {
                //page.render('testfile.jpeg',{format: 'jpeg', quality: '100'});
                if (!result) {
                    logger.info('No username detected');
                    ph.exit();
                    reject();
                    return;
                }
                logger.info("waiting for load...");
                setTimeout(function () {
                    logger.info("finished waiting, posting app:");
                    _page.evaluate(function (mailObj) {
                        document.querySelector('#subject').value = mailObj.title;
                        document.querySelector('#message').value = mailObj.body;
                        document.querySelector('.default-submit-action[name=post]').click();
                    }, function () {
                        setTimeout(function () {
                            page.evaluate(function () {
                                return document.URL.split('&sid')[0]
                            }, function (url) {
                                if (url.indexOf('t=') > -1) {
                                    logger.info('app posted!');
                                    logger.info(url);
                                    fulfill(url);
                                } else {
                                    reject();
                                    logger.info("Possibly did not upload");
                                }
                                logger.info('Exiting');
                                ph.exit();
                            });
                        }, 10000);
                    }, mailObj);
                }, 10000);
            }, mailObj, username, password);
        });
    });
};

var readAudit = function(){
    logger.info("Starting audit read");
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
            logger.info("opened page? status: ", status);
            if (status.indexOf('success') == -1) {
                reject('Did not load');
                logger.error("Failed to load page");
                _ph.exit();
            }
            logger.info("Reading data");
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
                logger.info("Got audit data");
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