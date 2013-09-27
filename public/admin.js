var i=0,j=0;
var survey = {
		name:"",
		questions:[]
	};
var socket;
window.onload = function () {
	socket = io.connect("http://10.106.23.132", {port: 8000, transports: ["websocket"]});
};

function addQuestion(elmt){
	console.log('hey');
	var olElement = document.createElement('li');
	var wrapper = document.createElement('div');
	var input = document.createElement('input');
	var button = document.createElement('button');
	var container = document.getElementById('questions');

	wrapper.className="question-wrapper";

	input.type = "text";
	input.className = "question";
	input.name = "question";

	button.type = "button";
	button.className = "addAnswer";
	button.innerHTML = "Add an answer";
	button.onclick = addAnswer(button);
	wrapper.appendChild(input);
	wrapper.appendChild(button);
	olElement.appendChild(wrapper);
	container.appendChild(olElement);

	//checkForm();

	input.focus();
}

function addAnswer(elmt){
	return function(){
		var wrapper = document.createElement('div');
		var input = document.createElement('input');
		var container = elmt.parentNode;
		
		wrapper.className = "answer-wrapper";

		input.type = "text";
		input.className = "answer";
		input.name="answer";
		wrapper.appendChild(input);
		console.log(container,wrapper,elmt);
		container.insertBefore(wrapper,elmt);

		//checkForm();

		input.focus();
	};
}

function checkForm(){
	if(document.getElementsByClassName('answer-wrapper').length>0) {
		var inputs = document.getElementsByTagName('input');
		for (var i = 0; i < inputs.length; ++i) {
			if(inputs[i].value === ""){
				document.getElementById('submitButton').style.display = "none";
				return;
			}
		}
		document.getElementById('submitButton').style.display = "block";
	}
}



function sendSurvey(){
	survey.name = document.getElementById('name').value;

	for (var i=0;i<document.getElementsByClassName('question-wrapper').length;++i){
		var question = {
			name:document.getElementsByClassName('question-wrapper')[i].firstChild.value,
			answers:[]
		};
		for(var j=0;j<document.getElementsByClassName('question-wrapper')[i].getElementsByClassName('answer-wrapper').length;++j){
			var answer = {
				name:document.getElementsByClassName('question-wrapper')[i].getElementsByClassName('answer-wrapper')[j].firstChild.value,
				count:0
			};
			question.answers.push(answer);
		}
		survey.questions.push(question);
	}
	var survey_string = JSON.stringify(survey, null, 4);

	socket.emit('survey',{survey:survey_string},function(data){ // Envoi du survey au serveur
		
		var form = document.getElementById('surveyForm');
		form.className += " shrank";

		var container = document.getElementById('infos');
		var link = document.createElement('a');
		var infosClient = document.createElement('span');

		link.href = "/result/"+data;
		link.innerHTML = "Activate survey & see the results";
		container.appendChild(link);

		infosClient.innerHTML='Send this to your coworkers';

		var qrcode = new QRCode(document.getElementById("qrcode"), {
			width : 200,
			height : 200
		});

		qrcode.makeCode('http://10.106.23.132:8000/answer/'+data);
		document.getElementById("qrcode").insertBefore(infosClient);

		var recap = document.getElementById('surveyRecap');
		recap.className += " shown";

	});
}