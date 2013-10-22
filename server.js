var path = require('path');	
var http = require('http'), url = require('url');
var httpProxy = require('http-proxy');
var express = require('express');
var mime = require('mime');
var request = require("request");
/* Jsprof external js file */
var jsprof =  require("./jsprof-server");

var app = express();

var standardFiles = ["ga.js", "jquery", "wforms",
					"validanguage", "livevalidation",
					"yav", "qforms", "formreform",
					"jstweener", "fx", "processing", 
					"raphael", "imagefx", "pixastic",
					"reflection", "activerecord",
					"date", "sylvester", "prettydate",
					"xregexp", "typeface", "firebug", "swfobject",
					"shortcuts"];

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
	var standardFileFound = false;
	console.log("Proxy server req.url: "+req.url + " mimeType: " + mimeType);

	var x = request(parsedUrl.href, function(error, response, body){
		console.log("Received response req.url: "+req.url + " mimeType: " + mimeType);
		

		/* Edit the html and javascript here */
		if(mimeType === "application/javascript") {
			/* Instrumentaion of js file */
			for (var z in standardFiles) {
				if (req.url.toLowerCase().indexOf(standardFiles[z]) != -1) {
					standardFileFound = true;
				}
			}
			if (!standardFileFound) {
				response.body = jsprof.jsInstrumentFileOnServer(response.body, false);		
			}
			//console.log("java script instrumented: "+ response.body);
			clientres.setHeader("Content-Type", mimeType);
			clientres.write(response.body);
			clientres.end();
		} else if((mimeType === "application/octet-stream") || (mimeType === "text/html")) {
			/* Check for html and javascript here */
			var scriptTagStart = 0;
			var scriptStart = 0;
			var scriptEnd = 0;
			var htmlBody = "";
			var htmlJavascript = "";
			standardFileFound = false;

			var htmlBodySubstring = response.body.substring(0, 15);
			if (htmlBodySubstring.toLowerCase().indexOf("<!doctype htm") != -1) {
					
				clientres.setHeader("Content-Type", "text/html");
				htmlBody = response.body; 

				// Insert jsprof.js into the html file
				var replaceString = "<head> <script>var timeToRun = 30;<" +
									"/script><script src=\"http://localhost:9000/jsprof-iframe.js\"><" + "/script>" +
									"<script type=\"text/javascript\" src='http://localhost:9000/lib/stacktrace.js'><" + "/script>";

				htmlBody = htmlBody.replace("<head>", replaceString);

				scriptTagStart = htmlBody.indexOf("<script");
				scriptStart = htmlBody.indexOf(">", scriptTagStart+1);
				scriptEnd = htmlBody.indexOf("</script");
				console.log("script start and end "+ scriptStart + " " + scriptEnd);

				while ((scriptTagStart != -1) && (scriptEnd != -1)) {	
					console.log("inside script start and end "+ scriptStart + " " + scriptEnd);
					
					if ((scriptEnd - scriptStart) > 1) {
						htmlJavascript = htmlBody.substring(scriptStart+1, scriptEnd); 
						var commentStart = htmlJavascript.indexOf("<!--");
						if (commentStart != -1){
							var commentEnd = htmlJavascript.indexOf("\n", commentStart);
							htmlJavascript = htmlJavascript.substring(0, commentStart) + 
									htmlJavascript.substring(commentEnd+1, htmlJavascript.size);
						}
						htmlJavascript = jsprof.jsInstrumentFileOnServer(htmlJavascript.toString(), false);
						console.log(htmlJavascript);
						htmlBody = htmlBody.substring(0, scriptStart+1) + htmlJavascript + 
										htmlBody.substring(scriptEnd, htmlBody.size);
						scriptEnd = htmlJavascript.size + scriptStart;
					}
					scriptTagStart = htmlBody.indexOf("<script", scriptStart+1);
					scriptStart = htmlBody.indexOf(">", scriptTagStart+1);
					scriptEnd = htmlBody.indexOf("</script", scriptEnd+1);
				}
				response.body = htmlBody;
			} else if (parsedUrl.href.indexOf(".css") !== -1) {
				clientres.setHeader("Content-Type", "text/css");
			} else if (parsedUrl.href.indexOf(".js") !== -1) {
				clientres.setHeader("Content-Type", "application/javascript");	
				/* Check for html and javascript here */
				standardFileFound = false;
				for (var z in standardFiles) {
					if (req.url.toLowerCase().indexOf(standardFiles[z]) != -1) {
						standardFileFound = true;
					}
				}
				if (!standardFileFound) {
					response.body = jsprof.jsInstrumentFileOnServer(response.body, false);		
				}
			} else {
				clientres.setHeader("Content-Type", "application/octet-stream");	
			}
			clientres.write(response.body);
			clientres.end();
		}
	});
	
	if ((mimeType !== "application/javascript") && 
			(mimeType !== "application/octet-stream") && 
			(mimeType !== "text/html")) {
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
