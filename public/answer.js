var socket;
var answerButtons;

window.onload = function(){
	socket = io.connect("http://10.106.23.132", {port: 8000, transports: ["websocket"]}); // Il faudra adapter les url à ta machine

	socket.emit('whereIsAdmin',{currentSurvey:document.location.pathname.substr(document.location.pathname.lastIndexOf('/')+1)}, function(data){
		data = JSON.parse(data);
		if(data.adminPosition){
			renderAnswerForm(data,data.adminPosition-1); // On demande où est l'admin, et on affiche la page en question
		}
	});

	socket.on('currentSurvey', function(data){
		console.log('yes');
		console.log(data);
	});

	socket.on('newQuestion', function(data){ // L'admin a changé de question, on affiche la page suivante
		renderAnswerForm(data.survey,data.questionNum-1);
	});
};

function handleClick(index){ // Envoi de la réponse
	var questionID = document.getElementsByTagName('h2')[0].id.replace(/\D+/,'');
	socket.emit('answer',{surveyID: document.location.pathname.substr(document.location.pathname.lastIndexOf('/')+1), questionID:questionID,answerID:index});
}

function renderAnswerForm(surveyData,position){ // Affichage des réponses en fonction de la question en cours.
	var container = document.getElementById('survey-content');
	container.innerHTML ="";
	if(position<surveyData.questions.length){
		var title = document.createElement('h2');
		title.id = "question"+position;
		title.innerHTML = '<span>'+(position+1)+' - </span>'+ surveyData.questions[position].name;
		container.appendChild(title);
		for(var i=0;i<surveyData.questions[position].answers.length;++i){
			var answer = document.createElement('a');
			answer.onclick = (function(){
				var currentIndex = i;
				return function(){
					handleClick(currentIndex);
				};
			})();
			answer.innerHTML = surveyData.questions[position].answers[i].name;
			container.appendChild(answer);
		}
	}else{
		container.innerHTML = "<span>Merci d'avoir répondu !</span>";
	}
}

// Ca fait pas mal de code quand on touche au DOM, mais j'aimerais qu'on continue à ne pas utiliser de jQuery.