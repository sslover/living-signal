
/*
 * routes/index.js
 * 
 * Routes contains the functions (callbacks) associated with request urls.
 
 */
var request = require('request'); // library to make requests to remote urls
var moment = require("moment"); // date manipulation library
var models = require("../models/models.js"); //db model
var http = require('http');
var ejs = require('ejs');
var fs = require('fs');

var microsoftServerURL = "http://128.122.98.53:3000/"; 

var dataSources = []; // a global array to keep all our current data, before we send to API
var emotions = []; // a gloal array to hold all our current emotions, after returned from API

var currentEmotion; // a global string to hold the current computed emotion


// Mechnical Turk details//
var config = {
    url: "https://mechanicalturk.sandbox.amazonaws.com", // for production --> https://mechanicalturk.amazonaws.com
    receptor: { port: 8080, host: undefined },
    poller: { frequency_ms: 10000 },
    accessKeyId: "AKIAIGNKFTBG56IKS5IA",
    secretAccessKey: "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" 
};

var mturk = require('mturk')(config);
// Mechnical Turk details//

/*GET 
*/
// API route to get the current weather
exports.index = function(req, res) {
        
        console.log("main page requested");

	    //build and render template
	    var templateData = {
	            data : currentEmotion,
	    }

	    console.log(templateData);

	    res.render('index.html', templateData);

}

exports.getWeather = function(req, res) {

        var remote_api_url = 'https://api.forecast.io/forecast/a345a0f8bba13003d1bb79fa4fad60d6/40.729523,-73.993445';

        // make a request to remote_api_url
        request.get(remote_api_url, function(error, response, data){
                
                if (error){
                        res.send("There was an error requesting remote api url.");
                        return;
                }

                console.log("GOT HERE!");

                console.log(data);
                
                // convert data JSON string to native JS object
                var weatherData = JSON.parse(data);
                
                console.log(weatherData);
                console.log("***********");

                // lets pull out the status and the current temperature, and save them to DB
                var status = weatherData.currently.icon; //clear-day, clear-night, rain, snow, sleet, wind, fog, cloudy, partly-cloudy-day, or partly-cloudy-night 
                var temperature = weatherData.currently.temperature;

                console.log("status is " + status);
                console.log("temperature is " + temperature);

			// save the weather to the database first
				newWeather = new models.Weather();
					newWeather.status = status;
					newWeather.temperature = temperature;

				// save the newWeather to the database
				// newWeather.save(function(err){
				// 	if (err) {
				// 		console.error("Error on saving new weather");
				// 		console.error("err");
				// 		return res.send("There was an error when adding the new weather");

				// 	} else {
				// 		console.log("Created a new weather record!");
				// 		console.log(newWeather);
				// 	}

				// });

                res.json({ status : 'OK', data: weatherData });
          
        })
};

// function to post a new job to mturk
exports.postMturk = function(req, res) {
	
	// 1. Create the HITType
	var Price = mturk.Price;
	var price = new Price("0.10", "USD");
	var title = "Count people in video for 45 seconds";
	var description = "You will watch a video for 45 seconds and count people";
	var duration = 180; // #seconds Worker has to complete after accepting
	var options = { keywords: "traffic, counting, people", autoApprovalDelayInSeconds: 5 };
	mturk.HITType.create(title, description, price, duration, options, function(err, hitType) {
		if (hitType.id == undefined){
			console.log("some error on te hit");
		}
		else{
	    console.log("Created HITType " + hitType.id);

	    // 2. Render the Question XML
	    var templateFile = fs.readFileSync(__dirname+'/static/questionForm.xml.ejs', 'ascii'); //__dirname+"/views/questionForm.xml.ejs"
	    console.log(templateFile);
	    var questionXML = ejs.render(templateFile);
	    //ejs.renderFile(templateFile, function(err, questionXML) {
	        console.log("Rendered XML: "+questionXML);

	        // 3. Create a HIT
	        var options = {maxAssignments: 5}
	        var lifeTimeInSeconds = 600; // 10 minutes
	        mturk.HIT.create(hitType.id, questionXML, lifeTimeInSeconds, {}, function(err, hit){
	        	console.log(hit);
	            console.log("Created HIT "+hit.id);
	            res.json({ status : 'OK', data: hit });
	        });
	   	  }
	    
	    });

}

// listens for when a HIT is returned and reviewable. For our purposes, we just approve automatically for now
mturk.on('HITReviewable', function(hitId) {
  console.log('HIT with ID ' + hitId + ' HITReviewable');
  var options = {assignmentStatus: "Submitted"};
  mturk.HIT.getAssignments(hitId, options, function(err, numResults, totalNumResults, pageNumber, assignments) {
  	if (assignments == undefined){
  		console.log("assignments are undefined");
  		currentEmotion = "Attentively upbeat";
  	}
  	else{
    assignments.forEach(function(assignment) {
      // review and store the data
      console.log(assignment);

      if (assignment.assignmentStatus == "Approved"){
      		 // should never get this, as assigments are immediately approved
      		 console.log("it is already approved");
      }
      else{

		 //reset array for fresh data
		 emotions = [];

          // it's fresh data, so we'll pull it out, post it to the server, and approve the comment
	      var peopleNum = assignment.answer.QuestionFormAnswers.Answer[0].SelectionIdentifier;
	      var carNum = assignment.answer.QuestionFormAnswers.Answer[1].SelectionIdentifier;
	      var jwNum = assignment.answer.QuestionFormAnswers.Answer[2].SelectionIdentifier;
	      getWeatherAPI();

	      dataSources[0] = peopleNum;
	      dataSources[1] = carNum;
	      dataSources[2] = jwNum;

	      // go ahead and approve the task on mTurk, so we don't get the data back over and over
		  approveMTurK();

	      /// !!!!! Values for this period !!!!! ///
	      console.log ("Amount of people " + peopleNum);
	      console.log ("Amount of cars " + carNum);
	      console.log ("Amount of jaywalkers " + jwNum);

	      // Code goes here to post it to API
	      // we need to loop through the dataSources array, and post each measure to the API

	      for (var i = 0; i<dataSources.length; i++){
	
			// get the time stamp
			var currentTime = new Date().getTime();

	      	if(i == 0){
				var data = { "updates" : [{ "measureName": "People", "value": dataSources[i], "timeStamp" : currentTime, "description" : "people at " + currentTime}]};      		
	      		serverPost(data);
	      	}

	      	else if(i == 1){
				var data = { "updates" : [{ "measureName": "Cars", "value": dataSources[i], "timeStamp" : currentTime, "description" : "Cars at " + currentTime}]};      		
	      		serverPost(data);
	      	}

	      	else if(i == 2){
				var data = { "updates" : [{ "measureName": "Jaywalkers", "value": dataSources[i], "timeStamp" : currentTime, "description" : "jaywalkers at " + currentTime}]};      		
	      		serverPost(data);	      	
	      	}

	      }

	      // now approve and dispose
	      function approveMTurK (){
	      var requesterFeedback = "nice work - thanks!";
	      assignment.approve(requesterFeedback, function(err) {
      			if(err){
      				console.log(err);
      			}

	      	console.log("approved the task in mturk!");

	      });
	  	}
  	   }
    });
	}
  });
});

function getWeatherAPI(){

        var remote_api_url = 'https://api.forecast.io/forecast/a345a0f8bba13003d1bb79fa4fad60d6/40.729523,-73.993445';

        // make a request to remote_api_url
        request.get(remote_api_url, function(error, response, data){
                
                if (error){
                        res.send("There was an error requesting remote api url.");
                        return;
                }

                else{
	                // Step 2 - convert 'data' to JS
	                // convert data JSON string to native JS object
	              	console.log(weatherData);

	                var weatherData = JSON.parse(data);

	                console.log(weatherData);
	                console.log("***********");

	                // lets pull out the status and the current temperature, and save them to DB
	                var status = weatherData.currently.icon; //clear-day, clear-night, rain, snow, sleet, wind, fog, cloudy, partly-cloudy-day, or partly-cloudy-night 
	                var temperature = weatherData.currently.temperature;

	                console.log("status is " + status);
	                console.log("temperature is " + temperature);

				// save the weather to the database first
					newWeather = new models.Weather();
						newWeather.status = status;
						newWeather.temperature = temperature;

						        // prepare data for JSON

					// save the newWeather to the database
					newWeather.save(function(err){
						if (err) {
							console.error("Error on saving new weather");
							console.error("err");
							return res.send("There was an error when adding the new weather");

						} else {
							console.log("Created a new weather record!");
							console.log(newWeather);
						}

					});

					// get the current weather vakye vased on the status to the API
					// possible values --> clear-day(6), clear-night(5), rain(2), snow(1), sleet(2), wind(3), fog(2), cloudy(4), partly-cloudy-day(5), or partly-cloudy-night(4)

					//var numStatus; // numerical number for the weather status
					switch (status) {
					    case "snow":
					        numStatus = 1;
					        break;
					    case "sleet":
					        numStatus = 2;
					        break;
					    case "rain":
					        numStatus = 2;
					        break;
					    case "fog":
					        numStatus = 2;
					        break;
					    case "wind":
					        numStatus = 3;
					        break;
					    case "cloudy":
					        numStatus = 4;
					        break;
					    case "partly-cloudy-night":
					        numStatus = 4;
					        break;
					    case "partly-cloudy-day":
					        numStatus = 5;
					        break;
					    case "clear-night":
					        numStatus = 5;
					        break;
					    case "clear-day":
					        numStatus = 6;
					        break;  
						default:
				  			numStatus = 4;
					}

					console.log("the number status is " + numStatus);
					// set the 4th data source to weather, and post it
					var weather = numStatus;
					dataSources[3] = weather;

					// get the time stamp
					var currentTime = new Date().getTime();

					var data = { "updates" : [{ "measureName": "Weather", "value": dataSources[3], "timeStamp" : currentTime, "description" : "weather at " + currentTime}]};      		
		      		serverPost(data);	

                }        
        });
}

// function to post to Server, based on data input
function serverPost(data){

    //var sessionData = JSON.parse(data);

    //console.log("sessionData is " + sessionData);

	// now let's post it to the server
	request.post({
	  headers: {'content-type' : 'application/x-www-form-urlencoded'},
	  url:     'http://128.122.98.53:3000/Session/BroadwayWaverly/Update/',
	  json:    data
	}, function(error, response, body){
	  	console.log("******** the response from the server is ********")
	  	console.log(body);
	  	console.log("the data measure we are sending is " + data);
	  	getSessionResults(data.updates[0].measureName);
	});

}

// function to get the session numResults
function getSessionResults(measure){

		var sessionName = "BroadwayWaverly";
		var entity = "PopPop"+measure;
		var startTime = new Date().getTime() - 15000; // current time minues 15 minutes 
        var remote_api_url = 'http://128.122.98.53:3000/SessionResult/?session='+sessionName+'&entity='+entity+'&starttime='+startTime+'&resolution=0&measure='+measure;

        console.log(remote_api_url);

        // make a request to remote_api_url
        request.get(remote_api_url, function(error, response, data){
                
                if (error){
                        res.send("There was an error requesting the session results at the remote api url.");
                        return;
                }

                // Step 2 - convert 'data' to JS
                // convert data JSON string to native JS object
                var sessionData = JSON.parse(data);

                console.log(sessionData);
                console.log("***********");

                var emotionData = {
                	measure: sessionData.measureName,
                	emotion: sessionData.entityResponse[0].emotion,
                	value: sessionData.entityResponse[0].runVal
                }
                //push into the emotions array
                emotions.push(emotionData);
                console.log(emotions);
                console.log("***********");
                // once the array is 4, we can compute which emotion we want
                if (emotions.length == 4) {
                	determineEmotion(emotions);
                }
                return sessionData;
   
        })

}

function determineEmotion(data){

	//typical data structure

	// [ { measure: 'Cars', emotion: 'Attentively Upbeat', value: 4 },
	// { measure: 'Jaywalkers', emotion: 'Happy', value: 2 },
	// { measure: 'People', emotion: 'Happy', value: 4 },
	// { measure: 'Weather', emotion: 'Happy', value: 4 } ]

	console.log("in determineEmotion");
	
	// need to figure out where each measure is in the array, because it's not always the same
	function arrayObjectIndexOf(myArray, searchTerm, property) {
	    for(var i = 0, len = myArray.length; i < len; i++) {
	        if (myArray[i][property] === searchTerm) return i;
	    }
	    return -1;
	}

	var jaywalkersNum = arrayObjectIndexOf(data, "Jaywalkers", "measure");
	var weatherNum = arrayObjectIndexOf(data, "Weather", "measure");
	var carsNum = arrayObjectIndexOf(data, "Cars", "measure");
	var peopleNum = arrayObjectIndexOf(data, "People", "measure");

	// if jaywalking is high, emotion is distressed/alarmed
	if (data[jaywalkersNum].value >= 5){
		currentEmotion = "Distressed";
	}
	// if weather is really bad, emotion is a bit unhappy
	//measure 4 is weather
	else if (data[weatherNum].value <= 2){
		currentEmotion = "A bit unhappy";
	}
	// lots of people and lots of cars
	else if (data[peopleNum].value >= 3 &&  data[carsNum].value>=3){
		currentEmotion = "Attentively upbeat";
	}
	// lots of people, not lots of cars
	else if (data[peopleNum].value >= 3 &&  data[carsNum].value<3){
		currentEmotion = "Happy";
	}
	// Not lots of people, not lots of cars
	else if (data[peopleNum].value < 3 &&  data[carsNum].value<3){
		currentEmotion = "Sleepy";
	}
	// else, if it doesn't meet the above conditions, then he's his default state, which is Attentively upbeat
	else{
		currentEmotion = "Attentively upbeat";
	}


	console.log("currentEmotion is " + currentEmotion);

}
