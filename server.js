'use strict';

var express = require('express');
var events = require('events')
var path = require('path');
var mailin = require('mailin');
var appParser = require('./appParser.js');
//var discordBot = require('./discordBot.js');
var phantom = require('phantom');
var fs = require('fs');
var basicAuth = require('basic-auth');

var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname,'config/config.json'))[env];
var port = config.port; // set our port
var username = config.username;
var password = config.password;


var eventEmitter = new events.EventEmitter();
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
    console.log('imglistrequest');
    res.send(getImagelist('/home/node/security/'));
});

app.get('/img/:tagId',auth, function(req,res) {
	console.log('imgrequest');
	res.sendFile('/home/node/img/'+req.param("tagId"));
});
app.get('/catimg/:tagId',auth, function(req,res) {
	console.log('catimgrequest');
	res.sendFile('/home/node/security/'+req.param("tagId"));
});

app.get('/catpics/',auth,function(req,res) {
	console.log('cats');
    	res.sendFile(path.join(__dirname,'/public/gallery.html'));
});

app.get('/catpicsold/',auth,function(req,res) {
	console.log('catsold');
	res.send(getFiles('/home/node/security/'));
});

app.get('/', function(req, res) {
	console.log('ZOMG');
	res.sendFile(path.join(__dirname,'/public/parser.html'));
});

app.get('/robots.txt',function(req,res){
	console.log('robot');
	res.type('text/plain');
	res.send("User-agent: *\nDisallow: /");
});

function getImagelist (dir){
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
            files_.push({url: 'catimg/' + file, time: getImageTime(file), date: getImageDate(file)});
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
	console.log(str);
	var mailObj = appParser.parseText(str);
	console.log('Title:'+mailObj.title);
	phantom.create(function (ph) {
		ph.createPage(function (page) {
			page.open("http://www.adept-draenor.org/board/posting.php?mode=post&f=30", function (status) {
				console.log("opened page? ", status);
				page.evaluate(function (mailObj) {
					document.querySelector('#username').value = 'AppBot';
					document.querySelector('#password').value = 'excal99';
					document.querySelector('.button1').click();
					return mailObj; 
				}, function (mailObj) {
				setTimeout(function(){
					page.evaluate(function(mailObj) {
						document.querySelector('#subject').value = mailObj.title;
						document.querySelector('#message').value = mailObj.body;
						document.querySelector('.default-submit-action').click();
					}, function(result){
						console.log(result);
						//discordBot.newAppMessage(mailObj.title);
						console.log('exiting');
						ph.exit();
					},mailObj);
				},10000);
				},mailObj);
			});
		});
	});
});

app.listen(port);
var exports = module.exports = app;

setInterval(function(){console.log('still alive at '+new Date().toString());},60*60*1000);
