//=================================================================================================
// JSProf - Javascript profiler written in Javascript
//=================================================================================================

/* GLOBALS */
var numberOfFunctions = 0;
var numberOfFunctionCalls = 0;
var functionList = [];
var callerCalleeList = [];
var functionListString = "";
var functionStats = [];
var pathTreeString = "";
var positionList = [];
var pathMatrix = {};
var warshallsMatrix = {};

var funcTree = { "name" : "jsprofile",
				  "executionTime" : 6,
				  "callee" : [{ "name" : "B",
								  "executionTime" : 6,
								    "callee" : [ {"name" : "F",
													"executionTime" : 5,
													  "callee" : [{ "name" : "A",
													  				"executionTime" : 3,
													  				"callee" : [{ "name" : "G",
													  								"executionTime" : 1,
													  								"callee" : []
													  							},

													  							{ "name" : "H",
													  								"executionTime" : 2,
													  								"callee" : []
													  							}]

													 			}]
												 }, 
												  {
												  	"name" : "C",
												  	"executionTime" : 1,
												  	"callee" : []

												  }]
							}]
					};


						



/* Test code for instrumentation */
var startCode = "var startTime = +new Date(); profileStartInFunction(arguments.callee," + 
	            "arguments.callee.caller);";
var endCode   = "profileEndInFunction(arguments.callee, startTime);";

//=================================================================================================
// Main function. Called from index.html
//=================================================================================================
function jsprofile(contents)
{
	/* Clear all the globals before each run */
	numberOfFunctions = 0;
	numberOfFunctionCalls = 0;
	functionList = [];
	callerCalleeList = [];
	functionListString = "";
	functionStats = [];
	positionList = [];

	//console.log(funcTree);
	console.log(computeHotPaths(funcTree));
	console.log("String: " + pathTreeString);
	return 0;

	var cleanedCode = rewriteCode(contents);
	if (cleanedCode&& listFunctionsInFile(cleanedCode)) {
		cleanedCode = instrumentCode(cleanedCode);
		eval(cleanedCode);
		console.log(functionStats);
		showResults();	
	}	
	return functionListString;
}

//=================================================================================================
// Debug function to print on the output box in browser 
//=================================================================================================
function debugLog(string) {
	functionListString += string + "<br>"; 
	document.getElementById('output').innerHTML = functionListString;
	console.log(string);
}

//=================================================================================================
// Every programmer formats code in a different way. This function is used to format the code in 
// a specific way such that the input code is universally understandable.
//=================================================================================================
function rewriteCode(contents)
{
	var toRewrite;
	/* Parse the code and rewrite it to the standard form that we are going to use */
	var optionsToRewrite = {"comment":true,"format":{"indent":{"style":"    "},"quotes":"single"}};
	try {
		toRewrite = esprima.parse(contents, {range: true, loc: true});
	} catch(e) {
		str = e.name + ": " + "rewriteCode"+ e.message;
		debugLog(str);
		cleanedCode = null;	
		/* XXX: Show the error on the screen too. */
	}
	cleanedCode = window.escodegen.generate(toRewrite, optionsToRewrite);
	return cleanedCode;
}

//=================================================================================================
// Function to list all the functions in the input file and note down the start and end line 
// numbers of the function definition. The object that is used to store the function specific data
// is in the form {"name" : "lstart", "lend"}
//=================================================================================================
function listFunctionsInFile(cleanedCode) 
{
	var list;
	functionList = [];
	try {
		parseout = esprima.parse(cleanedCode, {range: true, loc: true});
	} catch(e) {
		str = e.name + ": " + "parse: " + e.message;
		debugLog(str);
		/* XXX: Show the error on the screen too. */
		return false;
	}
	list = parseout.body;	
	numberOfFunctions = 0;
	listFunctionsRecursive(list);
	return true;
}

//=================================================================================================
// Function that recursively looks into the input code and gets the definitions of the functions in
// the code.
//=================================================================================================
function listFunctionsRecursive(list) 
{
	var obj = {};
	for (var key in list) 
	{
		if (list.hasOwnProperty(key))
		{
			obj = list[key];
			switch (obj.type)
			{
				case "FunctionDeclaration":
					/*
					 * In our design we like the input code to be in an array. 
					 * Esprima gives the line numbers starting from 1, hence we
					 * subtract the line numbers by 1
					 */
					functionList[obj.id.name] = {"name": obj.id.name, 
											     "lstart": obj.loc.start.line-1, 
												 "lend": obj.loc.end.line-1};
					listFunctionsRecursive(obj.body.body);
					break;
				case "VariableDeclaration":
					listFunctionsRecursive(obj.declarations);
					break;
				case "VariableDeclarator":
					if (obj.init && (obj.init.type === "FunctionExpression")) {
						functionList[obj.id.name] = {"name": obj.id.name, 
													 "lstart": obj.init.loc.start.line-1, 
													 "lend": obj.init.loc.end.line-1};
						listFunctionsRecursive(obj.init.body.body);
					}
					break;
				case "ExpressionStatement":
					//debugLog(obj.expression);
					if (obj.expression.right !== undefined){
						if((obj.expression.type === "AssignmentExpression") && 
							(obj.expression.right.type === "FunctionExpression")) {
							var functionName = 
									getNameLeftOfAssignmentExpression(obj.expression.left);
							functionList[functionName] = {"name": functionName,
									"lstart": obj.expression.right.loc.start.line -1,
								 	"lend": obj.expression.right.loc.end.line-1};
							listFunctionsRecursive(obj.expression.right.body.body);
						}
					}
					break;
				default:
					/* do nothing */
			}
		}
	}
}
//=================================================================================================
// Function to get name from left operand of an assignment expression. It is recursive to get the
// whole name when then expresson is something like this it returns vijay.pasikanti.umass
// vijay.pasikanti.umass = function() { 
// 	  return 0;
// };
//=================================================================================================
function getNameLeftOfAssignmentExpression(left) {
	if(left === undefined) {
		return; 
	}
	if(left.type === "MemberExpression") {
		if (left.property !== undefined) {
			return (getNameLeftOfAssignmentExpression(left.object) + "." + left.property.name);	
		}
	} else if(left.type === "Identifier") {
		return left.name;
	}
	
}

//=================================================================================================
// Function to fill up a list with all the positions where functions are defined
//=================================================================================================
function sortFunctionPositions(linesOfCode)
{
	var positionList = [];
	
	for(var i in functionList)
	{
		positionList[functionList[i].lstart] = {"name": functionList[i].name, "position" : "start"};
		positionList[functionList[i].lend] = {"name": functionList[i].name, "position" : "end"};
	}
	return positionList;
}

//=================================================================================================
// Function to deal with return statements being strewn in the function definition
//=================================================================================================
function dealWithReturnStatements(code)
{
	for(var i=0; i<code.length; i++)
	{
		if(code[i].indexOf("return ") != -1)
		{
			/* Function is returning another function */
			if(code[i].indexOf("(") != -1)
			{
				/* Function returned is not an anonymous function */
				if(code[i].indexOf("function") == -1)
				{

					endCode = findAndGetFunctionName(code, i);
					code[i] = code[i].replace("return " , "var JSProfTemp = ");
					code[i] = code[i] + " " + endCode + " return JSProfTemp;";
				}
				/* Function returned is an anonymous function */
				else
				{
					/* All you need to do is increment i till you find end of function definition*/
					code[i] = code[i].replace("return " , "var JSProfTemp = ");
					while(code[i].indexOf(" };") == -1)
					{
						i++;
					}
					endCode = findAndGetFunctionName(code, i);
					code[i] = code[i] + " " + endCode + " return JSProfTemp;";
				}
			}

			/* Normal return values */	
			else
			{
				endCode = findAndGetFunctionName(code, i);
				code[i] = " " + endCode + code[i];
			}
		}
	}

	return code;
}

function findAndGetFunctionName(code, i) {
	var endCode;
	
	while (positionList[i] === undefined) {
		if (i == positionList.length) {
			return ";";
		}
		i++;
	}
	if(positionList[i].position === "end") {
		endCode = "profileEndInFunction(\"" + positionList[i].name + "\", startTime);";
		return endCode;
	}
}

//=================================================================================================
// Converts the code array into a string
//=================================================================================================
function getStringCode(code)
{
	/* Testing how the output looks. Looks cleaner than when you use JSON.stringify */
	var cc = "";
	for(var z in code)
	{
		cc = cc + code[z];

	}
	return rewriteCode(cc);
}

//=================================================================================================
// Function to add instrumentation to the code
//=================================================================================================
function instrumentCode(cleanedCode)
{
	var code = cleanedCode.split("\n");
	positionList = sortFunctionPositions(code.size);

	/* Inserting startCode and endCode in every function definition */
	for(var i in positionList)
	{
		if(positionList[i].position === "start")
		{
			startCode = "var startTime = +new Date(); profileStartInFunction(\"" +
				positionList[i].name + "\",arguments.callee.caller);";
			code[i] = code[i] + " " + startCode;
		}
		else if(positionList[i].position === "end")
		{
			endCode = "profileEndInFunction(\""+ positionList[i].name + 
				"\", startTime);";

			code[i] = endCode + " " + code[i];
		}
	}

	/* Deal with return statements being strewn in the function definition */
	code = dealWithReturnStatements(code);
	return getStringCode(code);
}

//=================================================================================================
// Function that is inserted at the start of every function definition
//=================================================================================================
function profileStartInFunction(calleeName, caller) {
	var callerName;
	var timestamp = +new Date();
	
	if(caller) {
		callerName = caller.name;
	} else {
		debugLog("Funtion caller not defined");
	}

	/* 
	 * Check if this callee has an entry in functionStats variable, 
	 * add otherwise 
	 */
	if (functionStats[calleeName] === undefined) {
		functionStats[calleeName] = {"name"      : calleeName,
									 "callers"   : [],
									 "hits"      : 0,
									 "timeOfExec": 0};
	}

	/* Now, check if callee's object has caller entry */
	if (caller !== undefined) {
		if (functionStats[calleeName].callers[callerName] === undefined) {
			functionStats[calleeName].callers[callerName] = {"name": callerName,
															 "hits": 0 };
		}
	}
	/* Update the number of hits */
	updateHits(calleeName, callerName);
}

//=================================================================================================
// Function inserted at the end of every function definition
//=================================================================================================
function profileEndInFunction(calleeName, startTime) {
	var curTime = +new Date();
	if (calleeName === undefined) {
		return;
	} 
	console.log(calleeName);
	functionStats[calleeName].timeOfExec += (curTime - startTime);
}

//=================================================================================================
// Function to update no. of hits for each function call 
//=================================================================================================
function updateHits(calleeName, callerName) {
	/* Update hits of function pairs if caller is defined */
	if(callerName !== undefined) {
		functionStats[calleeName].callers[callerName].hits += 1;
	}
	functionStats[calleeName].hits += 1; 
}

//=================================================================================================
//This function is used to initialize the pathMatrix variable
//=================================================================================================
function initializePathMatrix()
{
	var size = functionList.length;
	pathMatrix = new Array(size);
	for(var i = 0; i<size; i++)
	{
		pathMatrix[i] = new Array(size);
		for (var j = 0; j < size ; j++) 
    	{
    	    pathMatrix[i][j] = 0;
    	}
	}
}

//=================================================================================================
//Tweaking Warshall's algorithm to get the path with largest hits
//=================================================================================================
function warshalls()
{
	 

}

//=================================================================================================
// Transpose pathMatrix
//=================================================================================================
function transposePathMatrix()
{
	/* Transposing matrix for Warshall's algorithm */
	var row = 0;
	var col = 0;
	for(var i in functionList)
	{
		col = 0;
		for(var j in functionList)
		{
			if(col <= row)
			{
				var temp = pathMatrix[functionList[i].name][functionList[j].name]
				pathMatrix[functionList[i].name][functionList[j].name] = pathMatrix[functionList[j].name][functionList[i].name];
				pathMatrix[functionList[j].name][functionList[i].name] = temp;
			}
			col++;
		}
		row++;
	}
}

//=================================================================================================
//Function to compute hot paths
//=================================================================================================
/*function computeHotPaths()
{
	
	/* 
	 * Check if this callee has an entry in functionStats variable, 
	 * add otherwise 
	 */
	/*if (functionStats[calleeName] === undefined) {
		functionStats[calleeName] = {"name"      : calleeName,
									 "callers"   : [],
									 "hits"      : 0,
									 "timeOfExec": 0};
	}*/

	/*for(var i in functionList)
	{
		for(var j in functionList)
		{
			//console.log(functionList[i].name + "and" + functionList[j].name);
			if(!pathMatrix[functionList[i].name])
			{
				pathMatrix[functionList[i].name] = {};
			}
			pathMatrix[functionList[i].name][functionList[j].name] = 0;
		}
	}

	for(var i in functionStats)
	{
		for(var j in functionStats[i].callers)
		{
			pathMatrix[functionStats[i].name][functionStats[i].callers[j].name] = functionStats[i].callers[j].hits;
		}
	}

	transposePathMatrix();

	/*for(var i in functionList)
	{
		for(var j in functionList)
		{
			console.log(functionList[i].name + "and" + functionList[j].name);
			console.log(pathMatrix[functionList[i].name][functionList[j].name] + "");
		}
		console.log("\n");
	}*/

	/*warshalls();



}*/



//=================================================================================================
// Function to compute hot paths
//=================================================================================================
function computeHotPaths(treeList)
{
	var maxExecTime = 0;
	var maxExecFuncName = "null";
	
	for(var x in treeList.callee)
	{
		var temp = computeHotPaths(treeList.callee[x]);
		if(temp > maxExecTime)
		{
			maxExecTime = temp;
			maxExecFuncName = treeList.callee[x].name;
		}
	}

	/* By the end of the loop maxExecTime will have the max exec time of all the callees of the current node */

	/* Take care of leaf nodes */
	if(!treeList.callee.length)
	{
		return treeList.executionTime;
	}

	/* For the rest of the nodes, add the current node's execution time as well */
	else
	{
		pathTreeString = pathTreeString.replace(maxExecFuncName, "");
		pathTreeString = pathTreeString + maxExecFuncName + "->" + treeList.name;
		return maxExecTime + treeList.executionTime;
	}
}

//=================================================================================================
// Function that shows all results. Exec times, frequency of calls etc 
//=================================================================================================
function showResults() {
	/* Print execution times for each function */
	debugLog("Execution times for individual functions:");
	for (var key in functionStats) {
		if (functionStats.hasOwnProperty(key)){
			debugLog("ExecTime: " + functionStats[key].timeOfExec + "ms for " +
				functionStats[key].name+"()");
		}
	}

	/* Frequency of calls for each function*/
	debugLog("<br>Frequency of calls for each function");
	for (var key in functionStats){
		if (functionStats.hasOwnProperty(key)){
			debugLog("Hits: " + functionStats[key].hits +
				" for " + functionStats[key].name+"()");
		}	
	}

	/* Print all functions pairs and number of their hits */
	debugLog("<br>Edges between caller and callee functions and frequency of calls:")
	for (var key in functionStats){
		if (functionStats.hasOwnProperty(key)){
			for (var key2 in functionStats[key].callers) {
				if (functionStats[key].callers.hasOwnProperty(key2)){
					debugLog("Calls: " + functionStats[key].callers[key2].hits + 
						" from "+ functionStats[key].callers[key2].name + "()-->" + 
						functionStats[key].name + "()");
				}
			}
		}
	}

	/* Print hot paths */
	//computeHotPaths();	
}
