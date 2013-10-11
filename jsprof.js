//==============================================================================================================
//JSProf - Javascript profiler written in Javascript
//==============================================================================================================
/* 
 * This function lists the functions from the text 'contents' 
 *TODO: Remove globals*/

var numberOfFunctions = 0;
var numberOfFunctionCalls = 0;
var functionList = [];
var callerCalleeList = [];
var functionListString = "";
var functionStats = [];

/* Test code for instrumentation */
var startCode = "var startTime = +new Date();profileStartInFunction(arguments.callee, arguments.callee.caller);";
var endCode   = "profileEndInFunction(arguments.callee, startTime);";

//==============================================================================================================
//Main function
//==============================================================================================================
function main(contents)
{
	cleanedCode = rewriteCode(contents);
	listFunctionsInFile(cleanedCode);
	cleanedCode = instrument(cleanedCode);
	eval(cleanedCode);
	showResults();
	return functionListString;
}

/* Debug function to print on the output box in browser */
function debugLog(string) {
	functionListString += string + "<br>"; 
	document.getElementById('output').innerHTML = functionListString;
	console.log(string);
}

//===============================================================================================================
//Every programmer formats code in a different way. This function is used to format the code in a specific way
//such that the input code is universally understandable.
//===============================================================================================================
function rewriteCode(contents)
{
	/* Parse the code and rewrite it to the standard form that we are going to use */
	var optionsToRewrite = {"comment":true,"format":{"indent":{"style":"    "},"quotes":"single"}};
	var toRewrite = esprima.parse(contents, {range: true, loc: true});
	cleanedCode = window.escodegen.generate(toRewrite, optionsToRewrite);
	return cleanedCode;
}

//==============================================================================================================
//Function to list all the functions in the input file and note down the start and end line numbers of the function
//definition. The object that is used to store the function specific data is in the form
//{"name" : "lstart", "lend"}
//==============================================================================================================
function listFunctionsInFile(cleanedCode) 
{
	functionList = [];
	parseout = esprima.parse(cleanedCode,  {range: true, loc: true});
	var list = parseout.body;	
	numberOfFunctions = 0;
	listFunctionsRecursive(list);
}

//==============================================================================================================
//Function that recursively looks into the input code and gets the definitions of the functions in the code
//==============================================================================================================
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
					/*In our design we like the input code to be in an array. Esprima gives the line numbers
					starting from 1, hence we subtract the line numbers by 1*/
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
				default:
					/* do nothing */
			}
		}
	}
}

//==============================================================================================================
//Function to fill up a list with all the positions where functions are defined
//==============================================================================================================
function sortFunctionPositions(linesOfCode)
{
	var positionList = [];
	
	for(var i in functionList)
	{
		positionList[functionList[i].lstart] = {"position" : "start"};
		positionList[functionList[i].lend] = {"position" : "end"};
	}
	return positionList;
}

//==============================================================================================================
//Function to deal with return statements being strewn in the function definition
//==============================================================================================================
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
					code[i] = code[i].replace("return " , "var JSProfTemp = ");
					code[i] = code[i] + " " + endCode + " return JSProfTemp;";
				}
				/*Function returned is an anonymous function */
				else
				{
					/*All you need to do is increment i till you find end of function definition*/
					code[i] = code[i].replace("return " , "var JSProfTemp = ");
					while(code[i].indexOf(" };") == -1)
					{
						i++;
					}
					
					code[i] = code[i] + " " + endCode + " return JSProfTemp;";
				}
			}

			/* Normal return values */	
			else
			{
				code[i] = " " + endCode + code[i];
			}
		}
	}

	return code;
}

//==============================================================================================================
//Converts the code array into a string
//==============================================================================================================
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

//==============================================================================================================
//Function to add instrumentation to the code
//==============================================================================================================
function instrument(cleanedCode)
{
	var code = cleanedCode.split("\n");
	var positionList = sortFunctionPositions(code.size);

	/* Inserting startCode and endCode in every function definition */
	for(var i in positionList)
	{
		if(positionList[i].position === "start")
		{
			code[i] = code[i] + " " + startCode;
		}
		else if(positionList[i].position === "end")
		{
			code[i] = endCode + " " + code[i];
		}
	}

	/* Deal with return statements being strewn in the function definition */
	code = dealWithReturnStatements(code);
	return getStringCode(code);
}

//==============================================================================================================
//Function that is inserted at start of every function definition
//==============================================================================================================
function profileStartInFunction(callee, caller) {
	var calleeName;
	var callerName;
	var timestamp = +new Date();
	
	if(callee) {
		calleeName = callee.name;  // May not work in IE  
	} else {
		debugLog("Funtion not defined");
		return;
	}

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

//==============================================================================================================
//Function inserted at end of every function definition
//==============================================================================================================
function profileEndInFunction(callee, startTime) {
	var curTime = +new Date();
	if(callee === undefined) {
		return;
	} 
	var calleeName = callee.name;
	functionStats[calleeName].timeOfExec += (curTime - startTime);
}

//==============================================================================================================
//Function to update no. of hits for each function call 
//==============================================================================================================
function updateHits(calleeName, callerName) {
	/* Update hits of function pairs if caller is defined */
	if(callerName !== undefined) {
		functionStats[calleeName].callers[callerName].hits += 1;
	}
	functionStats[calleeName].hits += 1; 
}

//==============================================================================================================
// Fuction that shows all results. Exec times, frequency of calls etc 
//==============================================================================================================
function showResults() {
	/* Print execution times for each function */
	debugLog("Execution times for individual functions:");
	for (var key in functionStats) {
		debugLog("ExecTime: " + functionStats[key].timeOfExec + "ms for " +
			functionStats[key].name+"()");
	}

	/* Frequency of calls for each function*/
	debugLog("<br>Frequency of calls for each function");
	for (var key in functionStats){
		debugLog("Hits: " + functionStats[key].hits +
			" for " + functionStats[key].name+"()");
	}

	/* Print all functions pairs and number of their hits */
	debugLog("<br>Edges between caller and callee functions and frequency of calls:")
	for (var key in functionStats){
		for (var key2 in functionStats[key].callers) {
			debugLog("Calls: " + functionStats[key].callers[key2].hits + 
				" from "+ functionStats[key].callers[key2].name + "()-->" + 
				functionStats[key].name + "()");
		}
	}	
}
