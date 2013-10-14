
function recur(number) {
	if (number == 0) {
		return 1;
	} else { 
		number -= 1;
		recur(number);
	}

}

recur(10);