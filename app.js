
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

// the ExpressJS App
var app = express();

//Create the HTTP server with the express app as an argument
var server = http.createServer(app);

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
var sockets = io.listen(server);

//Set the sockets.io configuration.
//THIS IS NECESSARY ONLY FOR HEROKU!
sockets.configure(function() {
  sockets.set('transports', ['xhr-polling']);
  sockets.set('polling duration', 10);
});


/// SOCKET STUFF ////

// create NodeJS HTTP server using 'app'
//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});