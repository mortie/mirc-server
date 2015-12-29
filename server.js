require("babel-register")();

var fs = require("fs");
var app = require("./app");

app.start("db");
