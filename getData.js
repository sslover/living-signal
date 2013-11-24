console.log("calling the scheduled task");

var routes = require('./routes/index.js');

function updateData() {
  console.log("getting the new data");
  routes.getWeatherAPI();
}
updateData();
process.exit();