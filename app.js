
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');
var cronJob = require('cron').CronJob;
var request = require('request'); // library to make requests to remote urls
var io = require('socket.io');
var moment = require("moment"); // date manipulation library
var models = require("./models/models.js"); //db model
var ejs = require('ejs');
var fs = require('fs');

// the ExpressJS App
var app = express();

//Create the HTTP server with the express app as an argument
var server = http.createServer(app);

// global variables that we need
var dataSources = []; // a global array to keep all our current data, before we send to API
var emotions = []; // a gloal array to hold all our current emotions, after returned from API

var currentEmotion; // a global string to hold the current computed emotion

// Mechnical Turk details//
var config = {
    url: "https://mechanicalturk.sandbox.amazonaws.com", // for production --> https://mechanicalturk.amazonaws.com
    receptor: { port: 8080, host: undefined },
    poller: { frequency_ms: 10000 },
    accessKeyId: "AKIAIA4I5F26YAE6TWTQ",
    secretAccessKey: "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" 
};

var mturk = require('mturk')(config);
// Mechnical Turk details//

// configuration of port, templates (/views), static files (/public)
// and other expressjs settings for the web server.
app.configure(function(){

  // server port number
  app.set('port', process.env.PORT || 5000);

  //  templates directory to 'views'
  app.set('views', __dirname + '/views');

  // setup template engine - we're using Hogan-Express
  app.set('view engine', 'html');
  app.set('layout','layout');
  app.engine('html', require('hogan-express')); // https://github.com/vol4ok/hogan-express

  app.use(express.favicon());
  // app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));

  //We're using bower components so add it to the path to make things easier
  app.use('/components', express.static(path.join(__dirname, 'components')));

  // database setup
  app.db = mongoose.connect(process.env.MONGOLAB_URI);
  console.log("connected to database");
  
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// ROUTES

var routes = require('./routes/index.js');

//home page
app.get('/',routes.index);

// API method to get the current weather
app.get('/getWeather', routes.getWeather);

// API method to request from mTurk
app.get('/postMturk', routes.postMturk);


// CRON JOBS // only works in local for testing
// API method to get the current weather
// runs every 15 minutes with a Cron job
// new cronJob('* * * * *', function(){
//     routes.getWeatherAPI();
// }, null, true);

/// SOCKET STUFF ////

//Start a Socket.IO listen
//Start a Socket.IO listen
var sockets = io.listen(server);

//Set the sockets.io configuration.
//THIS IS NECESSARY ONLY FOR HEROKU!
sockets.configure(function() {
  sockets.set('transports', ['xhr-polling']);
  sockets.set('polling duration', 10);
});

//If the client just connected, give them the current emotion!
sockets.sockets.on('connection', function(socket) { 

  socket.emit('connection', currentEmotion);

});


/// SOCKET STUFF ////

/// MTURK Listener LOGIC////

// listens for when a HIT is returned and reviewable. For our purposes, we just approve automatically for now
mturk.on('HITReviewable', function(hitId) {
  console.log('HIT with ID ' + hitId + ' HITReviewable');
  var options = {assignmentStatus: "Submitted"};
  mturk.HIT.getAssignments(hitId, options, function(err, numResults, totalNumResults, pageNumber, assignments) {
    if (assignments == undefined){
      console.log("assignments are undefined");
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
                  var status = weatherData.hourly.icon; //clear-day, clear-night, rain, snow, sleet, wind, fog, cloudy, partly-cloudy-day, or partly-cloudy-night 
                  var temperature = weatherData.hourly.temperature;

                  console.log("status is " + status);
                  console.log("temperature is " + temperature);

        // // save the weather to the database first
        //   newWeather = new models.Weather();
        //     newWeather.status = status;
        //     newWeather.temperature = temperature;

        //             // prepare data for JSON

        //   // save the newWeather to the database
        //   newWeather.save(function(err){
        //     if (err) {
        //       console.error("Error on saving new weather");
        //       console.error("err");
        //       return res.send("There was an error when adding the new weather");

        //     } else {
        //       console.log("Created a new weather record!");
        //       console.log(newWeather);
        //     }

        //   });

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

  console.log("......determining emotion....");
  
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
  // emit the new emotion to the clients
  sockets.sockets.emit('newData', currentEmotion);
  
  // post the new emotion to the yun

}

// create NodeJS HTTP server using 'app'
//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});