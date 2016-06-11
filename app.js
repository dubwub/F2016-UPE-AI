//requires
var express = require('express');
var handlebars  = require('express-handlebars');
var app = express();

// app.get('/', function (req, res) {
//   res.send('Hello World!');
// });

app.engine('handlebars', handlebars({defaultLayout: 'main'})); // renders /view/layouts/main.handlebars
app.set('view engine', 'handlebars');

app.get('/', function (req, res) {
    res.render('home'); // renders /view/home.handlebars WITHIN main.handlebars
});

app.listen(3000, function () {
  console.log('Server listening on port 3000');
});