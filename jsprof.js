
/* 
 * This function lists the functions from the text 'contents' 
 */
var numberOfFunctions = 0;
var functionList = [];
var functionCallerList = "Function call list (callee, caller) pairs: <br>";

function listFunctionsInFile(contents) {
	functionList = [];
	functionCallerList = "Function call list (callee, caller) pairs: <br>";	
	functionCallerList += "Funtion callee: " + arguments.callee.name + " " + 
						  "Funtion caller: " + arguments.callee.caller.name + "<br>";

	var functionListString = "List of Functions with their start and end line numbers: <br>";
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
	return functionListString;
}

function listFunctionsRecursive(list) {
	functionCallerList += "Funtion callee: " + arguments.callee.name + " " + 
						  "Funtion caller: " + arguments.callee.caller.name + "<br>";

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