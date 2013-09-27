var util = require("util"),
	io = require("socket.io"),
	express = require('express'),
	lessMiddleware = require('less-middleware'),
	socket,
	app = express(),
	fs = require('fs'),
	participants = [];

function init(){
	app.set('views', __dirname + '/tpl')
		.set('view engine', "jade")
		.engine('jade', require('jade').__express)
		.use(lessMiddleware({
			src      : __dirname + "/public",
			compress : true
		}))
		.use(express.static(__dirname + '/public'))
		.use(express.cookieParser())
		.use(express.session({secret: 'secret', key: 'express.sid'}))
		.use(express.bodyParser())
		.get('/', function(req, res) {
			res.setHeader('Content-Type', 'text/plain');
			res.end('It works.');
		})
		.get('/answer/:survey', function(req,res){
			fs.readFile('surveys/'+req.params.survey+'.json', 'utf8', function (err, data) {
				if (err) throw err;
				util.log(data);
				res.render('answer', {survey:JSON.parse(data)});
			});
		})
		.get('/result/:survey', function(req, res) {
			res.redirect('/result/'+req.params.survey+'/1');
		})
		.get('/result/:survey/:questionnum', function(req, res) {
			fs.readFile('surveys/'+req.params.survey+'.json', 'utf8', function (err, data) {
				if (err) throw err;
				var jsonData = JSON.parse(data);
				jsonData.adminPosition = req.params.questionnum;
				fs.writeFile('surveys/'+req.params.survey+'.json', JSON.stringify(jsonData), function (err) {
					if (err) throw err;
					socket.sockets.emit('newQuestion', {survey:jsonData,questionNum:req.params.questionnum});
					res.render('result', {survey:jsonData,questionNum:req.params.questionnum});
				});
				
			});
		})
		.get('/admin', function(req, res) {
			res.render("admin");
		})
		.use(function(req, res, next){
			res.setHeader('Content-Type', 'text/plain');
			res.send(404, 'Page introuvable !');
		});

	socket = io.listen(app.listen(8000));
	socket.configure(function() {
		socket.set("transports", ["websocket"]);
		socket.set("log level", 2);
	});
	socket.set('authorization', function (data, accept) {
		// check if there's a cookie header
		if (data.headers.cookie) {
			// if there is, parse the cookie
			data.cookie = parseCookie(data.headers.cookie);
			// note that you will need to use the same key to grad the
			// session id, as you specified in the Express setup.
			data.sessionID = data.cookie['express.sid'];
		} else {
			// if there isn't, turn down the connection with a message
			// and leave the function.
			return accept('No cookie transmitted.', false);
		}
		// accept the incoming connection
		accept(null, true);
	});

	setEventHandlers();
}

var setEventHandlers = function() {
	socket.sockets.on("connection", onSocketConnection);
};

function onSocketConnection(client) {
	util.log("New client has connected: "+client.handshake.sessionID);
	for (var i = 0; i < participants.length; i++) {
		util.log(participants[i].id);
	}
	client.on("disconnect", onClientDisconnect);
	client.on("answer", onAnswer);
	client.on("survey", onSurvey);
	client.on('whereIsAdmin',clientLost);
	participants.push(client);
}

function onClientDisconnect() {
	participants.slice(this);
}

function onAnswer(data){
	fs.readFile('surveys/'+data.surveyID+'.json', 'utf8', function (err, datajson) {
		if (err) throw err;
		var jsonData = JSON.parse(datajson);
		jsonData.questions[data.questionID].answers[data.answerID].count +=1;
		fs.writeFile('surveys/'+data.surveyID+'.json', JSON.stringify(jsonData), function (err) {
			if (err) throw err;
			socket.sockets.emit('answerReceived', {survey:jsonData,questionID:data.questionID});
		});
	});
}

function onSurvey(data,fn){
	util.log(data.survey);
	var random_name = Math.random().toString(36).slice(2);
	fs.writeFile('surveys/'+random_name+'.json', data.survey, function (err) {
		if (err) throw err;
		console.log('It\'s saved!');
		fn(random_name);
	});
}

function clientLost(data,fn){
	fs.readFile('surveys/'+data.currentSurvey+'.json', 'utf8', function (err, data) {
		if (err) throw err;
		fn(data);
	});
}

init();