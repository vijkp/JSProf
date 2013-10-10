
var answer = 6 * 7;

function add(x,y) {	return x+y;
}

function substract(x,y) {	return x-y;
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

console.log(add(2,3));
console.log(substract(3,2));
console.log(multiply(2,3));
max(3,2);
