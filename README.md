JSProf
======

Description:

This is a JavaScript Profiler which reports the following information

	1. Execution times for individual functions
	2. Edges between caller and callee functions
	3. Frequency of calls
	4. Reconstruction of the dynamic call paths
	5. Identification of hot paths
	6. Tracking sources/causes of asynchronous callbacks

Reading Material: <br>
	1. http://eloquentjavascript.net/contents.html <br>
	2. http://www.adequatelygood.com/JavaScript-Module-Pattern-In-Depth.html <br>
	3. http://yuiblog.com/crockford/ <br>
	4. http://esprima.org/ <br>
	5. http://www.jslint.com/ <br>


Setup

======
This chapter describes the setup required to run the profiler

Requirements
* Node.js
* Any browser (Preferably Google Chrome or Mozilla Firefox)

npm packages that are required
* esprima
* escodegen
* estraverse
* path
* http
* url
* request
* mime
* http-proxy
* express

Steps to setup proxy server
* Go to the nodejs command prompt and change the directory to the one
where you have stored the JSProf source code. Run the le server.js.
* Change the browser settings to always fetch data from the proxy server
congured at "localhost:9000".

Using the proler
* Go to the browser and type localhost:9000 on the address bar. The user
interface provided appears and you are good to go!