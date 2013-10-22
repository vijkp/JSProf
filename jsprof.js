//=================================================================================================
// JSProf - Javascript profiler written in Javascript
//=================================================================================================

/* GLOBALS */
var anonymousNumber = 0;
var numberOfFunctions = 0;
var numberOfFunctionCalls = 0;
var functionList = [];
var callerCalleeList = [];
var functionListString = "";
var functionStats = [];
var pathTreeString = [];
var positionList = [];
var funcTree = {"name": "root",
				"executionTime": 0,
				"child": [],
				"level": -1,
				"parentNode": {},
				"isInstrumented": false,
				"selfTime" : 0};
var currentNode = funcTree;
var treeTopDownList = [];
var globalMaxExecTime = -9999;
var globalHotPath = [];
var anonymousNumber = 0;
var callBackList = [];
var profileEnable = true;

/* Test code for instrumentation */
var startCode = "var startTime = profileStartInFunction(arguments.callee," + 
	            "arguments.callee.caller);";
var endCode   = "profileEndInFunction(arguments.callee, startTime);";

function initializeAllGlobals(){
	/* Clear all the globals before each run */
	anonymousNumber = 0;
	numberOfFunctions = 0;
	numberOfFunctionCalls = 0;
	functionList = [];
	callerCalleeList = [];
	functionListString = "";
	functionStats = [];
	positionList = [];
	pathTreeString = [];
	funcTree = [];
	globalMaxExecTime = -9999;
	globalHotPath = [];
	anonymousNumber = 0;
	callBackList = [];

	funcTree = {"name": "root",
				"executionTime": 0,
				"child": [],
				"level": -1,
				"parentNode": {},
				"isInstrumented": false,
				"selfTime" : 0};
	currentNode = funcTree;
}

//=================================================================================================
// Main function. Called from index.html
//=================================================================================================
function jsprofile(contents)
{
	initializeAllGlobals();

	var cleanedCode = rewriteCode(contents);
	if (cleanedCode&& listFunctionsInFile(cleanedCode)) {
		
		cleanedCode = rewriteCode(cleanedCode);
		dealWithCallbacks(cleanedCode);
		cleanedCode = changeCodeForCallBacks(cleanedCode);

		/* You need to re compute the start and end lines of the function definitions because
		* the previous dealing with call backs will add new lines to the instrumented code */
		cleanedCode = rewriteCode(cleanedCode);
		listFunctionsInFile(cleanedCode);
		cleanedCode = instrumentCode(cleanedCode);
		eval(cleanedCode);
		console.log(cleanedCode);
		showResults();	
	}	
	return functionListString;
}


//=================================================================================================
// Function to check if an object is empty
//=================================================================================================
function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }

    return true;
}

//=================================================================================================
// Debug function to print on the output box in browser 
//=================================================================================================
function debugLog(string) {		
	functionListString += string + "<br>"; 
	//document.getElementById('output').innerHTML = functionListString;
}

//=================================================================================================
// Every programmer formats code in a different way. This function is used to format the code in 
// a specific way such that the input code is universally understandable.
//=================================================================================================
function rewriteCode(contents)
{
	var toRewrite = "";
	/* Parse the code and rewrite it to the standard form that we are going to use */
	var optionsToRewrite = {comment:true, format:{indent:{style:'    '}, quotes: 'double'}};
	try {
		toRewrite = esprima.parse(contents, {raw: true, tokens: true, range: true, comment: true});
		//console.log("toRewrite: "+ toRewrite);
		//toRewrite = window.escodegen.attachComments(toRewrite, toRewrite.comments, toRewrite.tokens);
		cleanedCode = escodegen.generate(toRewrite, optionsToRewrite);
		//console.log("cleanedCode "+ cleanedCode);
	} catch(e) {
		str = e.name + ": " + "rewriteCode: "+ e.message;
		debugLog(str);
		cleanedCode = null;	
		/* XXX: Show the error on the screen too. */
	}
	return cleanedCode;
}

//=================================================================================================
// Function that changes code required for async callbacks
//=================================================================================================
function changeCodeForCallBacks(cleanedCode)
{
	var code = cleanedCode.split("\n");
	var appendChar;
	var index;
	var firstIndex;
	var secondIndex;
	
	/* For every start code add extra args of startTime and function name */
	for(var x in callBackList)
	{
		/*First deal with function calls*/
		index = callBackList[x].lstart - 1;
		
		/*For example replace the function call profile()
		* with profile(startTime, functionName) */
		firstIndex = code[index].indexOf((callBackList[x].name + "("));
		secondIndex = code[index].indexOf((callBackList[x].name + "(" + ")"));

		/*No arguments present */
		if((secondIndex - firstIndex) == 0 )
		{
			appendChar = "";
		}
		else
		{
			appendChar = ","
		}

		if(!callBackList[x].isDefinition)
		{
			/* Do the actual appending */
			code[index] = code[index].replace((callBackList[x].name + "(") , 
						(callBackList[x].name + "(" + "startTime, " + callBackList[x].callerName + appendChar));
		}
		else
		{
			/* Do the actual appending */
			code[index] = code[index].replace((callBackList[x].name + "(") , 
						(callBackList[x].name + "(" + "startTime, " + "calleeName" + ", currentNode" + appendChar));
		}
		
		
		/*Now deal with function definitions */
		if(!functionList[callBackList[x].name])
		{
			return getStringCode(code);
		}
		index = functionList[callBackList[x].name].lstart;
		
		/*For example replace the function call profile()
		* with profile(startTime, functionName) */
		firstIndex = code[index].indexOf((callBackList[x].name + "("));
		secondIndex = code[index].indexOf((callBackList[x].name + "(" + ")"));

		/*No arguments present */
		if((secondIndex - firstIndex) == 0 )
		{
			appendChar = "";
		}
		else
		{
			appendChar = ","
		}

		/* Do the actual appending. Function definition already has the appending done so dont bother doing that again */
		if(!callBackList[x].isDefinition)
		{
			code[index] = code[index].replace((callBackList[x].name + "(") , 
						(callBackList[x].name + "(" + "startTimeOfCaller, " + callBackList[x].callerName + appendChar));
			index = functionList[callBackList[x].name].lend;
			code[index] = "profileCallBackEnd(startTimeOfCaller,\"" + callBackList[x].callerName +"\", currentNode)" + ";" + code[index];
		}
		else
		{
			/*Append end function for callback */
			index = functionList[callBackList[x].name].lend;
			code[index] = "profileCallBackEnd(startTime,\"" + callBackList[x].callerName +"\", currentNode)" + ";" + code[index];
		}
		
	}
	return getStringCode(code);
}

//=================================================================================================
// Function that deals with asynchronous callbacks
//=================================================================================================
function dealWithCallbacks(cleanedCode)
{
	var list;
	try {
		parseout = esprima.parse(cleanedCode, {range: true, loc: true});
	} catch(e) {
		str = e.name + ": " + "parse: " + e.message;
		debugLog(str);
		/* XXX: Show the error on the screen too. */
		return false;
	}
	list = parseout.body;	
	dealWithCallbacksRecursive(list);
}

//=================================================================================================
// Function that deals with asynchronous callbacks
//=================================================================================================
function dealWithCallbacksRecursive(list, callerName)
{
	var obj = {};
	
	for (var key in list)
    {
		obj = list[key];

		if(obj.type == "ExpressionStatement")
		{
			if(obj.expression.type == "CallExpression")
			{
				var args = obj.expression.arguments;
				
				for(var x in args)
				{
					if(args[x].type == "CallExpression")
					{
						/* Callback function is being called */
						callBackList.push({"name" : args[x].callee.name,
							"lstart": args[x].callee.loc.start.line,
							"lend": args[x].callee.loc.end.line,
							"isDefinition": false,
							"callerName" : callerName});
					}

					else if(args[x].type == "FunctionExpression")
					{
						/* Callback function is being defined */
						if(args[x].id)
						{
							var name = args[x].id.name;
							/*Add info into call back list*/
							callBackList.push({"name": name,
								"lstart": args[x].id.loc.start.line,
								"callerName" : callerName,
								"isDefinition" : true,
							"lend": args[x].id.loc.end.line});
						}
						else
						{
							var name = "anonymous" + anonymousNumber;
							anonymousNumber = anonymousNumber + 1;
							/*Add info into call back list*/
							callBackList.push({"name": name,
								"lstart": args[x].loc.start.line,
								"callerName" : callerName,
								"isDefinition" : true,
							"lend": args[x].loc.end.line});
						}

						/*Add this function into functionList. Add 1 to make sure the definition and calls are different*/
						functionList[name] = {"name": name,
							"lstart": args[x].loc.start.line + 1,
							"lend": args[x].loc.end.line - 1};
					}
				}
			}
		}
		else if(obj.body)
		{
			//This can be a block statement or a function declaration inside which another function is called.
			if(obj.id && obj.body.body)
				dealWithCallbacksRecursive(obj.body.body, obj.id.name);
		}
	}
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
		str = e.name + ": " + "parseCode: " + e.message;
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
					/* This is for a = function(); kind of expressions*/
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
					} else {
					/* Here we want to deal with (function(){})(); kidn of expressions */
					/* obj.expression.right will be undefined in this case */
					if((obj.expression.type === "CallExpression")) {
						if (obj.expression.callee.type === "FunctionExpression") {
							var functionName = "anonymous" + anonymousNumber;
							anonymousNumber += 1;
							functionList[functionName] = {"name": functionName,
														  "lstart": obj.expression.callee.loc.start.line -1,
														  "lend": obj.expression.callee.loc.end.line-1};
							listFunctionsRecursive(obj.expression.callee.body.body);
							}
						}
						/* Takes care of the definitions like foo.bar(function(){});*/
						if (obj.expression.arguments !== undefined) {
							listFunctionsRecursive(obj.expression.arguments);
						}
					}
					break;
				case "FunctionExpression":
					var functionName = "anonymous" + anonymousNumber;
					anonymousNumber += 1;
					functionList[functionName] = {"name": functionName,
												  "lstart": obj.loc.start.line -1,
												  "lend": obj.loc.end.line-1};
					listFunctionsRecursive(obj.body.body);
					break;

				/*case "ReturnStatement":
					   	var returnFuncList = obj.argument.properties;
					   	for(var x in returnFuncList)
					   	{
					   		console.log(returnFuncList);
					   		if(returnFuncList.value.type == "FunctionExpression")
					   		{
					   			functionList[returnFuncList.key.name] = {"name": returnFuncList.key.name,
														  "lstart": obj.expression.callee.loc.start.line -1,
														  "lend": obj.expression.callee.loc.end.line-1};
								//listFunctionsRecursive(obj.expression.callee.body.body);
							}
					   	}*/
					    
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
			} else {
				/* Normal return values */	
				endCode = findAndGetFunctionName(code, i);
				code[i] = " " + endCode + code[i];
			}
		}
	}

	return code;
}

//=================================================================================================
// Function to get the function name from positionList
//=================================================================================================
function findAndGetFunctionName(code, i) {
	var endCode = ";";
	while ((i <= code.length) && (positionList[i] === undefined)) {
		if (i == positionList.length) {
			return ";";
		}
		i++;
	}

	if (i <= code.length) {
		if(positionList[i].position === "end") {
			endCode = "profileEndInFunction(\"" + positionList[i].name + "\", startTime);";
			return endCode;
		}
	}
	return endCode;
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
	return cc;
	//return rewriteCode(cc);
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
			startCode = "var startTime =  profileStartInFunction(\"" +
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
	//return code;
}

//=================================================================================================
// Function used to add node to tree
//=================================================================================================
function addNodeToFuncTree(callerNode, calleeName, isInstrumented) {
	var newNode = { "name": calleeName,
					"executionTime": 0,
					"child": [],
					"parentNode": callerNode,
					"selfTime" : 0,
					"level" : -1,
					"isInstrumented": isInstrumented}
	callerNode.child.push(newNode);
	return newNode;
}

//=================================================================================================
// Function that is inserted at the start of every function definition
//=================================================================================================
function profileStartInFunction(calleeName, caller) {
	
	if(!profileEnable) { 
			return;
	} else {
		console.log("js profile: function call");
	}

	var callerName;
	var currentFunc;
	var parentNodeFunc;
	var timestamp = -1;
	var i = 0;
	
	if(caller) {
		callerName = caller.name;
	} else {
		debugLog("Funtion caller not defined");
	}

	var trace = printStackTrace();
	//console.log(trace);		
	if (currentNode === undefined) {
		currentNode = funcTree;
	}
	if (currentNode.name === "root") {
		for (i = (trace.length - 1); i >= 0 ; i--){
			var arr = trace[i].split(" ");
			if (arr[0] === "profileStartInFunction") {
				break;
			}
			currentNode = addNodeToFuncTree(currentNode, arr[0], true);
		}
		currentNode.isInstrumented = true;
	} else {
		for (i = 0; i < trace.length; i++){
			var arr = trace[i].split(" ");
			if (arr[0] === "profileStartInFunction") {
				var arr2 = trace[i+1].split(" ");
				currentFunc = arr2[0];
				var arr3 = trace[i+2].split(" ");
				parentNodeFunc = arr3[0];
				currentNode = addNodeToFuncTree(currentNode, currentFunc, true);
				break;
			}
		}
	}
	/* Store the current function in the functree in a variable current function. 
	 * If it changes then build a new path from the root.
	 * Root may change. so create a new root kind of and update the func tree.
	 */

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
	timestamp = +new Date();
	return timestamp;
}

//=================================================================================================
// Function inserted at the end of every function definition
//=================================================================================================
function profileEndInFunction(calleeName, startTime) {
	
	if(!profileEnable) { 
		return;
	} else {
		console.log("js profile: function end" + profileEnable);
	}

	var curTime = +new Date();
	if (calleeName === undefined) {
		return;
	} 
	if (currentNode !== undefined) {
		currentNode.executionTime = (curTime - startTime);
		currentNode.selfTime = currentNode.executionTime;
		currentNode = currentNode.parentNode;
	} else {
		currentNode = funcTree;
	}
	
	if (functionStats[calleeName] !== undefined) {
		functionStats[calleeName].timeOfExec += (curTime - startTime);
	}
}

//=================================================================================================
// Function inserted at the end of every callback functiond definition
//=================================================================================================
function profileCallBackEnd(startTimeOfCaller, callerName, callBackNode) {
	
	if(!profileEnable) { 
		return;
	} else {
		console.log("js profrile callback" + profileEnable);
	}

	var curTime = +new Date();
	if (callerName === undefined) {
		return;
	} 
	if (callBackNode !== undefined) {
		callBackNode.executionTime = (curTime - startTimeOfCaller);
		callBackNode.selfTime = callBackNode.executionTime;	
	} else {
		callBackNode = funcTree;
	}
	
	if (functionStats[callerName] !== undefined) {
		functionStats[callerName].timeOfExec += (curTime - startTimeOfCaller);	
	}
}

//=================================================================================================
// Function to update no. of hits for each function call 
//=================================================================================================
function updateHits(calleeName, callerName) {
	/* Update hits of function pairs if caller is defined */
	if(callerName !== undefined) {
		functionStats[calleeName].callers[callerName].hits += 1;
	}
	if (functionStats[calleeName] !== undefined) {
		functionStats[calleeName].hits += 1; 
	}
}

//=================================================================================================
// Function to compute hot paths
//=================================================================================================
function computeHotPaths(treeList)
{
	if(treeList != undefined)
	{
		var maxExecTime = 0;
		var maxExecFuncName = "null";
		var maxExecFuncLevel = -1;

		for(var x in treeList.child)
		{
			var temp = computeHotPaths(treeList.child[x]);
			if(temp >= maxExecTime)
			{
				maxExecTime = temp;
				maxExecFuncName = treeList.child[x].name;
				maxExecFuncLevel = treeList.child[x].level;
			}
		}

		/* By the end of the loop maxExecTime will have the max exec time of all the callees of the current node */

		/* Take care of leaf nodes */
		if(treeList.child && !treeList.child.length)
		{
			return treeList.selfTime;
		}

		/* For the rest of the nodes, add the current node's execution time as well */
		else
		{
			
			var top = pathTreeString.pop();
			
			/* If it is the first element of the stack push the current maxExecFuncName else just pusn the same top back in
			 *Basically you want to peek at the top element, if the top element is the same then no need to insert it again */
			if(top)
			{
				pathTreeString.push(top);
			}			
			else
			{
				pathTreeString.push({"name" : maxExecFuncName,
									 "level": maxExecFuncLevel});
			}

			/* Cant insert node of lower level, clear tree then */
			if(top && maxExecFuncLevel > top.level)
			{
				pathTreeString = [];
				pathTreeString.push({"name" : maxExecFuncName,
									 "level": maxExecFuncLevel});
			}

			pathTreeString.push({"name" : treeList.name,
								 "level": treeList.level});

			return maxExecTime + treeList.selfTime;
		}
	}
}

//=================================================================================================
// This function is used to compute the self time of all nodes
//=================================================================================================
function computeSelfTime(treeList)
{
	if(treeList != undefined)
	{
		for(var x in treeList.child)
		{
			treeList.selfTime = treeList.selfTime - treeList.child[x].executionTime;
		}
		
		for(var x in treeList.child)
		{
			computeSelfTime(treeList.child[x]);
		}
	}
}

//=================================================================================================
// This function is used to print the tree
//=================================================================================================
function printTreeTopDown(funcTree, level) {
	var curNode = funcTree;
	var treeTopDownListNode = {};
	if(curNode !== undefined) {
		if (curNode.isInstrumented) {
			/* Print current node with level information */
			treeTopDownListNode = {	"name": curNode.name,
									"level": level,
									"selfTime": curNode.selfTime,
									"totalTime": curNode.executionTime};
			treeTopDownList.push(treeTopDownListNode);
			funcTree.level = level;
		}
		for (var key in curNode.child) {
			if (curNode.child.hasOwnProperty(key)) {
				printTreeTopDown(curNode.child[key], level+1);
			}	
		}	
	}
}

//=================================================================================================
// Function used to get a tree without the instrumented functions
//=================================================================================================
function getCleanedTree(treeList)
{
	return;
	// No OP.

	if(treeList != undefined)
	{
		if(treeList.name == "eval")
		{
			treeList.selfTime = 0;
			return treeList;
		}
		else
		{
			return getCleanedTree(treeList.child[0]);
		}
	}
}

//=================================================================================================
// Function that shows all results. Exec times, frequency of calls etc 
//=================================================================================================
function showResults() {
	
	/* Print execution times for each function */
	/* Compute hot path */	
	funcTree = getCleanedTree(funcTree);
	computeSelfTime(funcTree);
	treeTopDownList = [];
	printTreeTopDown(funcTree, 0);
	
	for(var i = 0; i<funcTree.child.length; i++)
	{
		pathTreeString = [];
		var tempTime = computeHotPaths(funcTree.child[i]);
		var top = pathTreeString.pop();
		if(!top)
		{
			pathTreeString.push({ "name": funcTree.child[i].name,
								  "level": 0} );
		}
		else
		{
			pathTreeString.push(top);
		}
		if(tempTime > globalMaxExecTime)
		{
			globalHotPath = pathTreeString;
			globalMaxExecTime = tempTime;
		}
	}
	
	debugLog("Execution times for individual functions:");
	for (var key in functionStats) {
		if (functionStats.hasOwnProperty(key)){
			debugLog("ExecTime: " + functionStats[key].timeOfExec + "ms for " +
				functionStats[key].name+"()");
		}
	}

	treeTopDownList = [];
	printTreeTopDown(funcTree, 0);
	//console.log(treeTopDownList);
	printTable();
	
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

	debugLog("Max executionTime: " + globalMaxExecTime);
	console.log("Max executionTime: " + globalMaxExecTime);
	debugLog("Path is ");
	for(var x=0 ; x<globalHotPath.length; x++)
	{		
		console.log(" " + globalHotPath[x].name + " ");
		debugLog(" " + globalHotPath[x].name + "->");
	}
}

//=================================================================================================
// Function used to print the table with all functions
//=================================================================================================
function printTable() {
	var table = document.createElement("table");
	var tableBody = document.createElement("tbody");
	var row = document.createElement("tr");
	
	var cell = document.createElement("td");
	var cellText = document.createTextNode("TotalTime ");

	/* Clear the old table */
	var tablediv = document.getElementById('tablediv');
	clearArray(tablediv); // Doesn't work

	cell.appendChild(cellText);
	row.appendChild(cell);

	cell = document.createElement("td");
	cellText = document.createTextNode("SelfTime");
	cell.appendChild(cellText);
	row.appendChild(cell);

	cell = document.createElement("td");
	cellText = document.createTextNode("Level");
	cell.appendChild(cellText);
	row.appendChild(cell);

	cell = document.createElement("td");
	cell.setAttribute('style', "text-align: left");
	cellText = document.createTextNode("Function Name");
	cell.appendChild(cellText);
	row.appendChild(cell);

	tableBody.appendChild(row);
	table.appendChild(tableBody);

	for (var key in treeTopDownList) {
		if (treeTopDownList.hasOwnProperty(key)){
			row = document.createElement("tr");

			cell = document.createElement("td");
			cellText = document.createTextNode(treeTopDownList[key].totalTime + " ms");
			cell.appendChild(cellText);
			row.appendChild(cell);	

			cell = document.createElement("td");
			cellText = document.createTextNode(treeTopDownList[key].selfTime + " ms");
			cell.appendChild(cellText);
			row.appendChild(cell);	

			cell = document.createElement("td");
			cellText = document.createTextNode(treeTopDownList[key].level);
			cell.appendChild(cellText);
			row.appendChild(cell);	

			cell = document.createElement("td");
			var i = 0, str = "";
			var level = treeTopDownList[key].level;
			if (level > 0) {
				for (i = 0; i < (level-1); i++) {
					str += 	"     ";
				}
				str += ("  |--" + treeTopDownList[key].name);
				cell.setAttribute('style', "text-align: left;");
			} else {
				str = treeTopDownList[key].name;
				cell.setAttribute('style', "text-align: left; font-weight: bold;");
			}
			
			cellText = document.createTextNode(str);
			cell.appendChild(cellText);
			row.appendChild(cell);	

			tableBody.appendChild(row);
			table.appendChild(tableBody);
		}
	}
	tablediv.appendChild(table);
}

/* Use this function to clear all elements in an array */
function clearArray(array) {
  while (array.length > 0) {
    array.pop();
  }
}
