var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// weather schema
var weatherScheme = new Schema({
	dateCreated : { type: Date, default: Date.now },
	status : String,
	temperature : Number
})

var Weather = mongoose.model('Weather', weatherScheme);

// export models
module.exports = {
    Weather: Weather
};

// in index.js can reference like:
//var models = require('./schema');
//models.Weather.findOne(...