//Chargement des différents modules

var util = require("util"),
	io = require("socket.io"),
	express = require('express'),
	lessMiddleware = require('less-middleware'),
	socket,
	app = express(),
	fs = require('fs'),
	parseCookie = require('connect').utils.parseCookie,
	participants = []; // Un tableau de participants, qui va très probablement devoir évoluer pour gérer les sessions

function init(){
	app.set('views', __dirname + '/tpl') // On set le répertoire des templates
		.set('view engine', "jade") // Template engine : jade
		.engine('jade', require('jade').__express) // On loade Jade
		.use(lessMiddleware({ //Conf du middleware less
			src      : __dirname + "/public",
			compress : true
		}))
		.use(express.static(__dirname + '/public')) //Répertoire public
		.use(express.cookieParser()) 
		.use(express.session({secret: 'secret', key: 'express.sid'})) // Ca et la ligne du dessus, c'est pour gérer les sessions. C'est balbutiant.
		.use(express.bodyParser()) // Load du parseur de requêtes
		.get('/', function(req, res) { // ROUTING
			res.setHeader('Content-Type', 'text/plain');
			res.end('It works.');
		})
		.get('/answer/:survey', function(req,res){ // ROUTING
			fs.readFile('surveys/'+req.params.survey+'.json', 'utf8', function (err, data) {
				if (err) throw err;
				util.log(data);
				res.render('answer', {survey:JSON.parse(data)}); // Appel du tpl answer.jade avec survey en parametre
			});
		})
		.get('/result/:survey', function(req, res) { // ROUTING
			res.redirect('/result/'+req.params.survey+'/1'); // On renvoit vers la première question du survey en question
		})
		.get('/result/:survey/:questionnum', function(req, res) { // ROUTING
			fs.readFile('surveys/'+req.params.survey+'.json', 'utf8', function (err, data) { // Lecture du JSON
				if (err) throw err;
				var jsonData = JSON.parse(data);
				jsonData.adminPosition = req.params.questionnum; // Maj de la position de l'admin dans le questionnaire
				fs.writeFile('surveys/'+req.params.survey+'.json', JSON.stringify(jsonData), function (err) { // On écrit dedans
					if (err) throw err;
					socket.sockets.emit('newQuestion', {survey:jsonData,questionNum:req.params.questionnum}); // Emission de l'alerte pour faire changer les utilisateurs de questions
					res.render('result', {survey:jsonData,questionNum:req.params.questionnum}); // On affiche la nouvelle page de resultats
				});
				
			});
		})
		.get('/admin', function(req, res) { // ROUTING
			res.render("admin");
		})
		.use(function(req, res, next){ // ROUTING 404
			res.setHeader('Content-Type', 'text/plain');
			res.send(404, 'Page introuvable !');
		});

	socket = io.listen(app.listen(8000)); // On écoute les sockets
	socket.configure(function() {
		socket.set("transports", ["websocket"]);
		socket.set("log level", 2);
	});

	// Début de gestion des cookies de session pour authentifier les utilisateurs
	// Mais connect a supprimé son parseCookie. Il faut trouver un autre moyen via les handshakes de socket.io
	/*socket.set('authorization', function (data, accept) {
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
	});*/

	setEventHandlers();
}

var setEventHandlers = function() {
	socket.sockets.on("connection", onSocketConnection); // Ecouteur de connexion
};

function onSocketConnection(client) { // Handler de connexion
	util.log("New client has connected: "+client.handshake.sessionID);
	for (var i = 0; i < participants.length; i++) {
		util.log(participants[i].id);
	}
	client.on("disconnect", onClientDisconnect); // Listeners
	client.on("answer", onAnswer);
	client.on("survey", onSurvey);
	client.on('whereIsAdmin',clientLost); // A la connexion d'un client sur une page answer, une requete est envoyée pour savoir où est l'admin.
	participants.push(client);
}

function onClientDisconnect() {
	participants.slice(this);
}

function onAnswer(data){
	fs.readFile('surveys/'+data.surveyID+'.json', 'utf8', function (err, datajson) { // On remplit le JSON avec la réponse
		if (err) throw err;
		var jsonData = JSON.parse(datajson);
		jsonData.questions[data.questionID].answers[data.answerID].count +=1;
		fs.writeFile('surveys/'+data.surveyID+'.json', JSON.stringify(jsonData), function (err) {
			if (err) throw err;
			socket.sockets.emit('answerReceived', {survey:jsonData,questionID:data.questionID});
		});
	});
}

function onSurvey(data,fn){ // Création de sondage sur le formulaire admin
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
		fn(data); // fn est une fonction de callback envoyée par le client via le socket.
	});
}

init();