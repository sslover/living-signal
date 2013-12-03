
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

var dataSources = new Array(); // a global array to keep all our current data
var emotions = new Array();

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
	            data : emotions,
	    }

	    console.log(templateData);

	    res.render('index.html', templateData);

}

exports.getWeather = function(req, res) {

        var remote_api_url = 'https://api.forecast.io/forecast/'+process.env.DarkSkyKey+'/40.729523,-73.993445';

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
	    console.log("Created HITType "+hitType.id);

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
	   
	    
	    });

}

// listens for when a HIT is returned and reviewable. For our purposes, we just approve automatically for now
mturk.on('HITReviewable', function(hitId) {
  console.log('HIT with ID ' + hitId + ' HITReviewable');
  var options = {assignmentStatus: "Submitted"};
  mturk.HIT.getAssignments(hitId, options, function(err, numResults, totalNumResults, pageNumber, assignments) {
    assignments.forEach(function(assignment) {
      // review and store the data
      console.log(assignment);

      if (assignment.assignmentStatus == "Approved"){
      		 // should never get this, as assigments are immediately approved
      		 console.log("it is already approved");
      }
      else{

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
  });
});

function getWeatherAPI(){

        var remote_api_url = 'https://api.forecast.io/forecast/'+process.env.DarkSkyKey+'/40.729523,-73.993445';

        // make a request to remote_api_url
        request.get(remote_api_url, function(error, response, data){
                
                if (error){
                        res.send("There was an error requesting remote api url.");
                        return;
                }

                else{
	                // Step 2 - convert 'data' to JS
	                // convert data JSON string to native JS object
	              	console.log(data);

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
		var entity = "Poppop";
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

                //push into the emotions array
                emotions.push(sessionData.entityResponse[0].emotion);

                return sessionData;
   
        })

}

