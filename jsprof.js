
/* 
 * This function lists the functions from the text 'contents' 
 * XXX: Not recursive yet.
 */
function listFunctionsInFile(contents) { 
	parseout = esprima.parse(contents,  {range: true, loc: true});
	console.log(parseout);
	var list = parseout.body;	
	var i,j = 0;
	var functionList = [];
	var functionListString = "List of Functions: <br>";
	console.log("List of Functions:");
	for (i=0; i<list.length; i++) {
		if (list[i].type === "FunctionDeclaration") {
			console.log(list[i].id.name);
			functionList[j] = list[i].id.name;
			functionListString = functionListString.concat(list[i].id.name) + "<br>" ;
			j++;
		}
	}
	console.log(functionList);
	return functionListString;
}