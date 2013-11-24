
/*
 * routes/index.js
 * 
 * Routes contains the functions (callbacks) associated with request urls.
 
 */
var request = require('request'); // library to make requests to remote urls
var moment = require("moment"); // date manipulation library
var models = require("../models/models.js"); //db model
var http = require('http');

var serverURL = "http://128.122.98.53:3000/"; 

/*GET 
*/
// API route to get the current weather

exports.getWeather = function(req, res) {

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

                    res.json({ status : 'OK', data: weatherData });
                }        
        });
};

exports.getWeatherAPI = function() {

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

				// now, lets post that data to the API
                postWeather(status);
                }        
        });
      
}

function postWeather (status){
	// post the current weather status to the API
	// possible values --> clear-day(6), clear-night(5), rain(2), snow(1), sleet(2), wind(3), fog(2), cloudy(4), partly-cloudy-day(5), or partly-cloudy-night(4)

	var numStatus; // numerical number for the weather status
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

	// get the time stamp
	var currentTime = new Date().getTime();

	// data object
	var data = { "updates" : [{ "measureName": "Weather", "value": numStatus, "timeStamp" : currentTime, "description" : "weather at " + currentTime}]}

	// now let's post it to the server
	request.post({
	  headers: {'content-type' : 'application/x-www-form-urlencoded'},
	  url:     'http://128.122.98.53:3000/Session/BroadwayWaverly/Update/',
	  json:    data
	}, function(error, response, body){
	  	console.log("******** the response from the server is ********")
	  	console.log(body);
	});

}

