
/*
 * routes/index.js
 * 
 * Routes contains the functions (callbacks) associated with request urls.
 
 */
var request = require('request'); // library to make requests to remote urls
var moment = require("moment"); // date manipulation library
var models = require("../models/models.js"); //db model
var http = require('http');

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
        })
};