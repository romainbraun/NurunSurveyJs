var testdata;
//var questionID;

window.onload = function () {
	var socket = io.connect("http://10.106.23.132", {port: 8000, transports: ["websocket"]});

    if(document.getElementById('answers')!== null){

        socket.on('answerReceived', function(dataR){

            //questionID = dataR.questionID;
            
            testdata = dataR.survey.questions[dataR.questionID].answers;
            updateGraph();
          });
    }
};

function updateGraph(){
  document.getElementById('test1').style.display = "block";
  document.getElementById('answers').style.display = "none";
    nv.addGraph(function() {
        var width = 600,
            height = 400;

        var chart = nv.models.pieChart()
            .x(function(d) { return d.name; })
            .y(function(d) { return d.count; })
            //.showLabels(false)
            .values(function(d) { return d; })
            .color(d3.scale.category10().range())
            .width(width)
            .height(height);

          d3.select("#test1")
              .datum([testdata])
            .transition().duration(1200)
              .attr('width', width)
              .attr('height', height)
              .call(chart);

        chart.dispatch.on('stateChange', function(e) { nv.log('New State:', JSON.stringify(e)); });

        return chart;
    });
}

function nextQuestion(){
  var questionID = document.location.pathname.substr(document.location.pathname.lastIndexOf('/')+1);
  document.location.replace(parseInt(questionID)+1);
}