var path = require('path');
var http = require('http'), url = require('url');
var httpProxy = require('http-proxy');
var express = require('express');
var mime = require('mime');
var request = require("request");
/* Jsprof external js file */
var jsprof =  require("./jsprof-server");

var app = express();

/* Log the requests */
app.use(express.logger('dev'));

/* Serve static files */
console.log(__dirname);
app.use(express.static(__dirname)); 

/* Parse request body into req.body.* */
app.use(express.bodyParser());

/* Create a proxy server */
httpProxy.createServer(function (req, res, proxy) {
	var clientreq = req;
	var clientres = res;
	var parsedUrl = url.parse(req.url);
	var mimeType = mime.lookup(parsedUrl.href);
	console.log("Proxy server req.url: "+req.url + " mimeType: " + mimeType);

	var x = request(parsedUrl.href, function(error, response, body){
		/* Edit the html and javascript here */
		if(mimeType === "application/javascript") {
			/* Instrumentaion of js file */
			response.body = jsprof.jsInstrumentFileOnServer(response.body);
			console.log("java script instrumented: "+ response.body);
			clientres.setHeader("Content-Type", mimeType);
			clientres.write(response.body);
			clientres.end();
		} else if(mimeType === "application/octet-stream") {
			/* Check for html and javascript here */
			var htmlBodySubstring = response.body.substring(0, 14);
			
			if (htmlBodySubstring.toLowerCase() === "<!doctype html") {
				clientres.setHeader("Content-Type", "text/html");
				/* Get the script portion of html file and instrument it */
				var scriptStart = response.body.indexOf("<script");
				var scriptEnd = response.body.indexOf("</script");

				console.log("Javascript start and end locations "+ scriptStart + "  "+ scriptEnd);

				console.log(response.body.substring(scriptStart, scriptEnd));

			} else if (parsedUrl.href.indexOf(".css") !== -1) {
				clientres.setHeader("Content-Type", "text/css");
			} else if (parsedUrl.href.indexOf(".js") !== -1) {
				clientres.setHeader("Content-Type", "application/javascript");	
				/* Check for html and javascript here */
				response.body = jsprof.jsInstrumentFileOnServer(response.body);
				console.log("java script2 instrumented: "+ response.body);
			} else {
				clientres.setHeader("Content-Type", mimeType);	
			}
			clientres.write(response.body);
			clientres.end();
		}
	});
	
	if ((mimeType !== "application/javascript") && 
			(mimeType !== "application/octet-stream")) {
		console.log("Piping request");
		req.pipe(x);
		x.pipe(res);	
	}

}).listen(8000);
console.log("Proxy server listening on port 8000")

/* Webserver: All 404 pages */
app.get("*", function(req, res){
	res.send("Error: 404 Page not found");
});

/* Start the webserver */
app.listen(9000);
console.log('Webserver listening on port 9000');
