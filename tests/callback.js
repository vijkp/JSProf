var fs = require('fs');
var myNumber = undefined;
function addme() {
}
function addOne() {
    fs.readFile('number.txt', addme(), function doneReading(err, fileContents) {
        myNumber = parseInt(fileContents);
        myNumber++;
    });
}
addOne();
console.log(myNumber);