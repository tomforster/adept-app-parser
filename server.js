'use strict';

var express = require('express');
var path = require('path');
var mailin = require('mailin');
var appParser = require('./appParser.js');
var discordBot = require('./discordBot.js');
var phantomScripts = require('./phantomScripts.js');
var fs = require('fs');
var basicAuth = require('basic-auth');
var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var port = config.port; // set our port
var username = config.username;
var password = config.password;

var sys = require('sys');
var exec = require('child_process').exec;

var app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use("/libs/", express.static(path.join(__dirname,"node_modules")));

var auth = function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.send(401);
    }

    var user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    }

    if (user.name === username && user.pass === password) {
        return next();
    } else {
        return unauthorized(res);
    }
};

//routes
app.get('/parser', function(req, res) {
    console.log('parserReq');
    res.sendFile(path.join(__dirname,'/public/parser.html'));
});

app.get('/imagelist',auth, function(req,res) {
    console.log('Camera 1 image list request');
    res.send(getImagelist('/home/node/security/','catimg/'));
});

app.get('/cam2imagelist',auth, function(req,res) {
    console.log('Camera 2 image list request');
    res.send(getImagelist('/home/node/security/cam2/','catimg2/'));
});

app.get('/img/:tagId',auth, function(req,res) {
    console.log('Saved image request');
    res.sendFile('/home/node/img/'+req.param("tagId"));
});
app.get('/catimg/:tagId',auth, function(req,res) {
    console.log('Camera 1 image request');
    res.sendFile('/home/node/security/'+req.param("tagId"));
});

app.get('/catimg2/:tagId',auth, function(req,res) {
    console.log('Camera 2 image request');
    res.sendFile('/home/node/security/cam2/'+req.param("tagId"));
});

app.get('/catpics/',auth,function(req,res) {
    console.log('Cat camera 1 page request.');
    res.sendFile(path.join(__dirname,'/public/gallery.html'));
});

app.get('/catpics2/',auth,function(req,res) {
    console.log('Cat camera 2 page request.');
    res.sendFile(path.join(__dirname,'/public/cam2gallery.html'));
});

app.get('/catpicsold/',auth,function(req,res) {
    console.log('Old cat images list');
    res.send(getFiles('/home/node/security/'));
});

app.get('/', function(req, res) {
    console.log('Root URL request.');
    res.sendFile(path.join(__dirname,'/public/parser.html'));
});

app.get('/robots.txt',function(req,res){
    console.log('Robot detected.');
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
});

app.post('/snapshot/1/',function(req,res){
    console.log('Snapshot camera 1');
    exec('snapshot-cam-1.sh',
        function (error, stdout, stderr) {
            if (error !== null) {
                console.log(error);
            } else {
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
            }
        }
    );
});

app.post('/snapshot/2/',function(req,res){
    console.log('Snapshot camera 2');
    exec('snapshot-cam-2.sh',
        function (error, stdout, stderr) {
            if (error !== null) {
                console.log(error);
            } else {
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
            }
        }
    );
});

//app.post('/deploy/',function(req,res){
//	console.log('Deploy');
//	exec('deploy-adept.sh',
//		function (error, stdout, stderr) {
//			if (error !== null) {
//				console.log(error);
//			} else {
//				console.log('stdout: ' + stdout);
//				console.log('stderr: ' + stderr);
//			}
//		}
//	);
//});

function getImagelist (dir,requestStr){
    var files_ = [];
    var files = fs.readdirSync(dir);
    files = files.filter(function(file){return file !== 'lastsnap.jpg'});
    files.sort(function(a, b) {
        return fs.statSync(dir + b).mtime.getTime() -
            fs.statSync(dir + a).mtime.getTime();
    });
    files.forEach(function(file){
        var name = dir + '/' + file;
        if (!(fs.statSync(name).isDirectory() || getExtension(file) !== 'jpg' || file === 'lastsnap.jpg')) {
            files_.push({url: requestStr + file, time: getImageTime(file), date: getImageDate(file)});
        }
    });
    return files_.slice(0,30);
}

function getImageTime(str){
    var splitstr = str.split(/[-_]/);
    if(splitstr.length < 7) return "";
    splitstr = splitstr.slice(3,6);
    return splitstr.join(':');
}

function getImageDate(str){
    var splitstr = str.split(/[-_]/);
    if(splitstr.length < 7) return "";
    splitstr = splitstr.slice(0,3);
    return splitstr.join('/');
}

function getExtension(filename) {
    return filename.split('.').pop();
}

function getFiles (dir){
    var files_ = "<html><body>";
    var files = fs.readdirSync(dir);
    files.sort(function(a, b) {
        return fs.statSync(dir + b).mtime.getTime() -
            fs.statSync(dir + a).mtime.getTime();
    });
    files.slice(0,100).forEach(function(file){
        var name = dir + '/' + file;
        if (!fs.statSync(name).isDirectory()){
            files_ +=("<a href='catimg/"+file+"'>"+file+"</a><br>");
        }
    });
    files_ += "</body></html>";
    return files_;
}

mailin.start({
    port: 25,
    host: '0.0.0.0',
    disableWebhook: true
},function(err){console.log(err)});

mailin.on('startMessage', function (connection) {
    console.log(JSON.stringify(connection));
});

mailin.on('message', function (connection, data, content) {
    if(connection.envelope.rcptTo.filter(function(rcpt){
            return rcpt.address == config.appEmail
        }).length < 1){
        console.log('bad email: '+JSON.stringify(connection.envelope.rcptTp));
        return;
    }
    var cheerio = require('cheerio');
    var $ = cheerio.load(data.html);
    var str = "";
    $('table table td').each(function (index, obj) {
        var li = $(obj).find('li');
        if (li.length > 0) {
            $(li).each(function (index, obj) {
                str += $(obj).text() + '\n';
            });
        } else {
            if ($(obj).text().trim().length !== 0) {
                str += $(obj).text().trim() + '\n';
            }
        }
    });
    str = str.replace(/\s{2,}/g, ' ');
    var mailObj = appParser.parseText(str);
    console.log('Title:'+mailObj.title);

    phantomScripts.postApp(mailObj);
});

app.listen(port,function(){

});

//setInterval(function(){console.log('still alive at '+new Date().toString());},60*60*1000);
