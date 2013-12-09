$(function() {
    var socket = io.connect(window.location.hostname);

    socket.on('connect', function() {

    });

    // Receive a message
    socket.on('connection', function(data) {

        // get the current status of popop
        $("#val1").text(data);
    });

    // Receive a message
    socket.on('newData', function(data) {

        // get the new status of poppop
        $("#val1").text(data);
    });

})