
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');
var cronJob = require('cron').CronJob;
var request = require('request'); // library to make requests to remote urls


// the ExpressJS App
var app = express();

// configuration of port, templates (/views), static files (/public)
// and other expressjs settings for the web server.
app.configure(function(){

  // server port number
  app.set('port', process.env.PORT || 5000);

  //  templates directory to 'views'
  app.set('views', __dirname + '/views');

  // setup template engine - we're using Hogan-Express
  // commenting out fr now
  // app.set('view engine', 'html');
  // app.set('layout','layout');
  // app.engine('html', require('hogan-express')); // https://github.com/vol4ok/hogan-express

  app.use(express.favicon());
  // app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));

  // database setup
  app.db = mongoose.connect(process.env.MONGOLAB_URI);
  console.log("connected to database");
  
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// ROUTES

var routes = require('./routes/index.js');

// API method to get the current weather
app.get('/getWeather', routes.getWeather);

// CRON JOBS //
// API method to get the current weather
// runs every 15 minutes with a Cron job
new cronJob('0,15,30,45 * * * *', function(){
    routes.getWeatherAPI();
}, null, true);

// create NodeJS HTTP server using 'app'
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});