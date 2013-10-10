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
var functionCallerList = "Function call list (callee, caller) pairs: <br>";
var functionListString;

//Test code for instrumentation
var startCode = "console.log('FunctionStart');";
var endCode = "console.log('FunctionEnd');";

//==============================================================================================================
//Main function
//==============================================================================================================
function main(contents)
{
	cleanedCode = rewriteCode(contents);
	listFunctionsInFile(cleanedCode);
	instrument(cleanedCode);
	return functionListString;
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
	functionListString = "List of Functions with their start and end line numbers: <br>";
	parseout = esprima.parse(cleanedCode,  {range: true, loc: true});
	var list = parseout.body;	
	numberOfFunctions = 0;
	listFunctionsRecursive(list);

	/* Print object in the console */
	console.log(functionList);
	
	/* Format functionList into readabe form */
	for (key in functionList)
	{
		functionListString += 	functionList[key].name  + ", " +
								functionList[key].lstart+ ", " +
								functionList[key].lend  + "<br>";
	}

	functionListString += "<br>"+"Object = " + JSON.stringify(functionList)+ "<br>";
	functionListString += "<br>"+functionCallerList;
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
					//do nothing
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
//Function to add instrumentation to the code
//==============================================================================================================
function instrument(cleanedCode)
{
	var code = cleanedCode.split("\n");
	var positionList = sortFunctionPositions(code.size);

	//Inserting startCode and endCode un every function definition
	for(var i in positionList)
	{
		if(positionList[i].position === "start")
		{
			code[i] = code[i] + startCode;
		}
		else if(positionList[i].position === "end")
		{
			code[i] = endCode + code[i];
		}
	}

	//Testing how the output looks. Looks cleaner than when you use JSON.stringify
	var cc = "";
	for(var z in code)
	{
		cc = cc + code[z];

	}
	console.log(rewriteCode(cc));
}