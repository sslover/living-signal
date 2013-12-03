$(function() {
    var socket = io.connect(window.location.hostname);

    socket.on('connect', function() {

    });

    // Receive a message
    socket.on('connection', function(data) {

        // get the current status of popop

    });

    // Receive a message
    socket.on('data', function(data) {

        // get the new status of poppop

    });

})