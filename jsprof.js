
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

	/* Parse the code and rewrite it to the standard form that we are going to use */
	var optionsToRewrite = {"comment":true,"format":{"indent":{"style":"    "},"quotes":"single"}};
	var toRewrite = esprima.parse(contents, {range: true, loc: true});
	code = window.escodegen.generate(toRewrite, optionsToRewrite);

	functionListString = "List of Functions with their start and end line numbers: <br>";
	parseout = esprima.parse(code,  {range: true, loc: true});
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
	var obj = {};
	for (var key in list) {
		if (list.hasOwnProperty(key)){
			obj = list[key];
			switch (obj.type)
			{
				case "FunctionDeclaration":
					functionList[obj.id.name] = {"name": obj.id.name, 
													   "lstart": obj.loc.start.line, 
													   "lend": obj.loc.end.line};
					listFunctionsRecursive(obj.body.body);
					break;
				case "VariableDeclaration":
					listFunctionsRecursive(obj.declarations);
					break;
				case "VariableDeclarator":
					if (obj.init.type === "FunctionExpression") {
						functionList[obj.id.name] = {"name": obj.id.name, 
													       "lstart": obj.init.loc.start.line, 
													   	   "lend": obj.init.loc.end.line};
						listFunctionsRecursive(obj.init.body.body);
					}
					break;
				default:
					//do nothing
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

