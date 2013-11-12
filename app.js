
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');


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

  // database - skipping until DB ready
  // app.db = mongoose.connect(process.env.MONGOLAB_URI);
  // console.log("connected to database");
  
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// ROUTES

var routes = require('./routes/index.js');
var darksky = require("darksky");

// API method to get the current weather
app.get('/getWeather', routes.getWeather);


// create NodeJS HTTP server using 'app'
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});