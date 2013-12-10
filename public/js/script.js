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
        // $("#vehicle").change(function(){
        // var selected = $(this).val();
        // var image = $("#selectedVehicle");
        //     image.fadeOut('fast', function () {
        //         image.attr('src', '/assets/images/mini/'+selected+'.png');
        //         image.fadeIn('fast');
        //     });
        //  });
    });

})