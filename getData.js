console.log("calling the scheduled task");

var ejs = require('ejs');
var fs = require('fs');

// Mechnical Turk details//
var config = {
    url: "https://mechanicalturk.sandbox.amazonaws.com", // for production --> https://mechanicalturk.amazonaws.com
    receptor: { port: 8080, host: undefined },
    poller: { frequency_ms: 10000 },
    accessKeyId: "AKIAJVN5RDEAJLLZUNDA",
    secretAccessKey: "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" 
};

var mturk = require('mturk')(config);
// Mechnical Turk details//

function updateData() {
  console.log("getting the new data");
  postMturk();
}

// function to post a new job to mturk
function postMturk() {
	
	// 1. Create the HITType
	var Price = mturk.Price;
	var price = new Price("0.10", "USD");
	var title = "Count people in video for 45 seconds";
	var description = "You will watch a video for 45 seconds and count people";
	var duration = 180; // #seconds Worker has to complete after accepting
	var options = { keywords: "traffic, counting, people", autoApprovalDelayInSeconds: 5 };
	mturk.HITType.create(title, description, price, duration, options, function(err, hitType) {
		if (err || hitType == undefined){
			console.log("some error on te hit");
		}
		else{
	    console.log("Created HITType " + hitType.id);

	    // 2. Render the Question XML
	    var templateFile = fs.readFileSync(__dirname+'/static/questionForm.xml.ejs', 'ascii'); //__dirname+"/views/questionForm.xml.ejs"
	    console.log(templateFile);
	    var questionXML = ejs.render(templateFile);
	    //ejs.renderFile(templateFile, function(err, questionXML) {
	        console.log("Rendered XML: "+questionXML);

	        // 3. Create a HIT
	        var options = {maxAssignments: 5}
	        var lifeTimeInSeconds = 600; // 10 minutes
	        mturk.HIT.create(hitType.id, questionXML, lifeTimeInSeconds, {}, function(err, hit){
	        	if (err){
	        		console.log("some error on the hit " + err);
	        	}
	        	else{
	        	console.log(hit);
	            console.log("Created HIT "+hit.id);
	        	}
	        });
	   	  }
	    
	    });

}

updateData();