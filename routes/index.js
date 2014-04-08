
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
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: secretAccessKey
};

var mturk = require('mturk')(config);
// Mechnical Turk details//

/*GET 
*/
exports.index = function(req, res) {
        
        console.log("main page requested");

	    //build and render template
	    var templateData = {
	            data : currentEmotion,
	    }

	    console.log(templateData);

	    res.render('index.html', templateData);

}

exports.manualMode = function(req, res) {
        
        console.log("manual page requested");

	    //build and render template
	    var templateData = {
	            data : currentEmotion,
	    }

	    console.log(templateData);

	    res.render('manual.html', templateData);

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
                var status = weatherData.hourly.icon; //clear-day, clear-night, rain, snow, sleet, wind, fog, cloudy, partly-cloudy-day, or partly-cloudy-night 
                var temperature = weatherData.hourly.temperature;

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
	
	console.log("in postMturk");
	// 1. Create the HITType
	var Price = mturk.Price;
	var price = new Price("0.10", "USD");
	var title = "Count people in video for 45 seconds";
	var description = "You will watch a video for 45 seconds and count people";
	var duration = 180; // #seconds Worker has to complete after accepting
	var options = { keywords: "traffic, counting, people", autoApprovalDelayInSeconds: 5 };
	mturk.HITType.create(title, description, price, duration, options, function(err, hitType) {
		if (err || hitType == undefined){
			console.log("some error on the hit " + err);
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
	        	if (err){
	        		console.log("some error on the hit " + err);
	        	}
	        	else{
	        	console.log(hit);
	            console.log("Created HIT "+hit.id);
	            res.json({ status : 'OK', data: hit });
	        	}
	        });
	   	  }
	    
	    });

}
