(function(){
	console.log("starting closure function");
	var t = 10;
	var t2 = 20;
	console.log(arguments.callee);
	console.log(arguments.caller);
	not(1,2);
})();

(function(){
	var t = 10;
	var t2 = 20;
})();

//(function () {
var abc = 0;
var umass;

umass = function(){
	function student(){
		return 0;
	}
	
};

var tmp;

function not(x,y) {
	abc = x+y;
	max(2,3);
	sub(2,3);
	sub(2,3);
	return sub(2,3);
}
function max(x,y) {
	var i=0;
	abc = x+y;
	while(i < 1000) {
		abc = x+y;
		i += 1;
	}
}
function add(x,y) {
	abc = x+y;
	max(2,3);	
	max(2,3);
}

function sub(x,y) {
	abc = x+y;
	max(2,3);
}

not(2,3);


// EXTRA CODE FROM OTHER TEST FILES

function recur(number) {
	if (number == 0) {
		return 1;
	} else { 
		number -= 1;
		recur(number);
	}

}

recur(10);


var answer = 6 * 7;

function add(x,y) {	return x+y;
}

function substract(x,y) {	add(x,y);return x-y;
}

function multiply(x,y) {
	var inside1 = function(argument) {
		function inside1inside1(){
			var a = 10;
			return 0;
		}
		var a = 10;
		var inside1inside2 = function(){
			var a = 5;
			return 2;
		}
		return a; 
	}

	function inside2(){		function inside2inside1(argument){
			var a = 10;
			return 0;
		}
		var a = 10;
		var inside2inside2 = function(){
			var a = 5;
			return 2;
		}
		return a;
	}
return x*y; }

function max(x,y) {
	return x;}

//add(2,3));
//console.log(substract(3,2));
//console.log(multiply(2,3));
add(2,3);
substract(2,3);
multiply(2,3);
max(3,2);
//})();
