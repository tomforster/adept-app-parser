const config = require('./config');
const Nightmare = require('nightmare');
const nightmare = Nightmare({ images: false });
const log = require('bristol');

const postApp = function(mailObj){
    log.info('Posting Adept App');
    const username = config.forumUsername;
    const password = config.forumPassword;
    return nightmare
        .goto(config.forumUrl)
        .wait('#phpbb')
        .evaluate(function() {
            return document.querySelector('title')
                .innerText;
        })
        .then(function(title){
            log.info("loaded page", title);
            if (title.indexOf('Login') > -1) {
                return nightmare
                    .insert('#username', username)
                    .insert('#password', password)
                    .wait(2000)
                    .click('.button[name=login]')
                    .wait('#subject')
            }
        }).then(function(){
            log.info("loaded post page");
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