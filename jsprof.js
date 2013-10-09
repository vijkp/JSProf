
/* 
 * This function lists the functions from the text 'contents' 
 *TODO: Remove globals*/

var numberOfFunctions = 0;
var numberOfFunctionCalls = 0;
var functionList = [];
var callerCalleeList = [];
var functionCallerList = "Function call list (callee, caller) pairs: <br>";
var functionListString;

function main(contents)
{
	listFunctionsInFile(contents);
	listFunctionCalls(contents);
	return functionListString;
}

function listFunctionsInFile(contents) {
	functionList = [];
	//functionCallerList = "Function call list (callee, caller) pairs: <br>";	
	//functionCallerList += "Funtion callee: " + arguments.callee.name + " " + 
	//					  "Funtion caller: " + arguments.callee.caller.name + "<br>";

	functionListString = "List of Functions with their start and end line numbers: <br>";
	parseout = esprima.parse(contents,  {range: true, loc: true});
	var list = parseout.body;	
	numberOfFunctions = 0;
	listFunctionsRecursive(list);

	/* Print object in the console */
	console.log(functionList);
	
	/* Format functionList into readabe form */
	for (key in functionList){
		
		functionListString += 	functionList[key].name  + ", " +
								functionList[key].lstart+ ", " +
								functionList[key].lend  + "<br>";
	}
	functionListString += "<br>"+"Object = " + JSON.stringify(functionList)+ "<br>";
	functionListString += "<br>"+functionCallerList;
}

function listFunctionsRecursive(list) {
	//functionCallerList += "Funtion callee: " + arguments.callee.name + " " + 
	//					  "Funtion caller: " + arguments.callee.caller.name + "<br>";

	var obj = {};
	for (var key in list) {
		if (list.hasOwnProperty(key)){
			obj = list[key];
			switch (obj.type)
			{
				case "FunctionDeclaration":
					console.log("function "+ obj.id.name);
					functionList[numberOfFunctions] = {"name": obj.id.name, 
													   "lstart": obj.loc.start.line, 
													   "lend": obj.loc.end.line};
					numberOfFunctions++;
					listFunctionsRecursive(obj.body.body);
					break;
				case "VariableDeclaration":
					listFunctionsRecursive(obj.declarations);
					break;
				case "VariableDeclarator":
					if (obj.init.type === "FunctionExpression") {
						console.log("VariableDeclarator "); console.log(obj.id.name);
						functionList[numberOfFunctions] = {"name": obj.id.name, 
													       "lstart": obj.init.loc.start.line, 
													   	   "lend": obj.init.loc.end.line};
						numberOfFunctions++;
						listFunctionsRecursive(obj.init.body.body);
					}
					break;
				default:
					console.log("do nothing " + obj.type)
			}
		}
	}
}

function listFunctionCalls(contents)
{
	parseout = esprima.parse(contents,  {range: true, loc: true});
	var list = parseout.body;	
	listFunctionCallsRecursively(list);
	functionListString += "<br>"+"List of function calls = " + JSON.stringify(callerCalleeList)+ "<br>";
}

function listFunctionCallsRecursively(list)
{
	var obj = {};
	for (var key in list) 
	{
		obj = list[key];
		console.log(obj.type);
		if(obj.type == "ExpressionStatement")
		{
				var expr = obj.expression;
				if(expr == "CallExpression")
				console.log("function "+ expr.callee.name);
				callerCalleeList[numberOfFunctionCalls] = {"name": expr.callee.name, 
												   		   "lstart": expr.callee.loc.start.line,
												   		   "lend": expr.callee.loc.end.line};
				numberOfFunctionCalls++;
		}
		else if(obj.body)
		{
			//This can be a block statement or a function declaration inside which another function is called.
			listFunctionCallsRecursively(obj.body.body);
		}
	}
}

