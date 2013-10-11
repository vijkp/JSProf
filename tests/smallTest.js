function returnTest()
{
	var x=10;
	if(x==3)
	{
		return (0);
	}
	else if(x==1)
	{
		return abc();
	}
	else
		return 1;
	return function () {
        var x = 5;
    };
}