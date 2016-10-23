var env = process.env.NODE_ENV || "development";
var path = require('path');
var config = require(path.join(__dirname,'config/config.json'))[env];
var Nightmare = require('nightmare');
var nightmare = Nightmare({ images: false });
const log = require('better-logs')('headless');

var postApp = function(mailObj){
    log.info('Posting Adept App');
    var username = config.forumUsername;
    var password = config.forumPassword;
    return nightmare
        .goto(config.forumUrl)
        .wait('#phpbb')
        .evaluate(function() {
            return document.querySelector('title')
                .innerText;
        })
        .then(function(title){
            if (title.indexOf('Login') > -1) {
                return nightmare
                    .insert('#username', username)
                    .insert('#password', password)
                    .wait(2000)
                    .click('.button1[name=login]')
                    .wait('#subject')
            }
        }).then(function(){
            return nightmare.insert('#subject', mailObj.title)
            .insert('#message', mailObj.body)
            .wait(2000)
            .click('[type=submit][name=post]')
            .wait('.postbody')
            .url()
            .end()
        })
};

// var readAudit = function(){
    // log.info("Starting audit read");
    // return new Promise(function(resolve,reject){
    //     var auditUrl = "http://www.guildaudit.com/g/9146";
    //     var _ph, _page;
    //
    //     phantom.create(['--load-images=no']).then(function(ph){
    //         _ph = ph;
    //         return _ph.createPage();
    //     }).then(function(page) {
    //         _page = page;
    //         return _page.open(auditUrl);
    //     }).then(function(status) {
    //         log.info("opened page? status: ", status);
    //         if (status.indexOf('success') == -1) {
    //             reject('Did not load');
    //             log.error("Failed to load page");
    //             _ph.exit();
    //         }
    //         log.info("Reading data");
    //         _page.evaluate(function () {
    //             var auditData = {characterData:[], lastCheck:""};
    //             var names = $(".characterRow .nameLink").map(function (index, value) {
    //                 return $(value).text()
    //             });
    //             var ilvls = $(".characterRow .iLvl").map(function (index, value) {
    //                 return $(value).text()
    //             });
    //             var upgradesPC = $(".characterRow .upgradesNumber").map(function (index, value) {
    //                 return $(value).text()
    //             });
    //             var auditInfo = $(".characterRow .audit").map(function (index, value) {
    //                 return $(value).text()
    //             });
    //             for (var i = 0; i < names.length; i++) {
    //                 auditData.characterData.push({name: names[i], ilvl: ilvls[i], upgrades: upgradesPC[i], audit: auditInfo[i]});
    //             }
    //             var lastCheck = $(".groupLastChecked").text();
    //             auditData.lastCheck = lastCheck.split(': ').pop();
    //             return auditData;
    //         }).then(function (auditData) {
    //             log.info("Got audit data");
    //             resolve(auditData);
    //             _ph.exit();
    //         });
    //     });
    // });
// };

module.exports = {
    postApp: postApp
    //,readAudit: readAudit
};