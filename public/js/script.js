$(function() {
    var socket = io.connect(window.location.hostname);

    socket.on('connect', function() {

    });

    // Receive a message
    socket.on('connection', function(data) {

        console.log("got new data and it is " + data);

        if (data == null){
            $("#val1").text("Hey good-looking!");
            $("#image_emotion").attr("src","/img/attentively-upbeat.png");
        }
        // get the new status of poppop
        $("#val1").text(data.message);
        // set the image right
        var imageName = data.emotion.replace(/\s+/g, '-').toLowerCase();
        $("#image_emotion").attr("src","/img/"+imageName+".png");
    });

    // Receive a message
    socket.on('newData', function(data) {

        console.log("got new data and it is " + data);

        // get the new status of poppop
        $("#val1").text(data.message);
        // set the image right
        var imageName = data.emotion.replace(/\s+/g, '-').toLowerCase();
        $("#image_emotion").attr("src","/img/"+imageName+".png");
    });

    $( "#upbeat").click(function() {
            console.log("upbeat clicked!");
            var data = 0;
            socket.emit('manualData', data);
    });

    $( "#happy" ).click(function() {
            var data = 1;
            socket.emit('manualData', data);
    });

    $( "#down" ).click(function() {
            var data = 2;
            socket.emit('manualData', data);
    });

    $( "#distressed" ).click(function() {
            var data = 3;
            socket.emit('manualData', data);
    });

    $( "#sleepy" ).click(function() {
            var data = 4;
            socket.emit('manualData', data);
    });

})