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
            log.debug("loaded page", title);
            if (title.indexOf('Login') > -1) {
                return nightmare
                    .insert('#username', username)
                    .insert('#password', password)
                    .wait(2000)
                    .click('.button1[name=login]')
                    .wait('#subject')
            }
        }).then(function(){
            log.debug("loaded post page");
            return nightmare.insert('#subject', mailObj.title)
            .insert('#message', mailObj.body)
            .wait(2000)
            .click('[type=submit][name=post]')
            .wait('.postbody')
            .url()
        })
};

module.exports = {
    postApp: postApp
};