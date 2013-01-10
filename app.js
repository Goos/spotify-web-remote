var express         = require("express"),
    sio             = require("socket.io"),
    http            = require("http"),
    spotify         = require("spotify-node-applescript"),
    spotifySearch   = require("spotify");

var app     = express();
var server  = http.createServer(app);

app.configure(function () {
    app.set('port', 5000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {
        pretty: true
    });
    app.use(express.static(__dirname + '/public'));
});

app.get('/', function (req, res) {
    var options = {};
    res.render('index', options);
});

var sio = sio.listen(server);

sio.on('connection', function (socket) {
    socket.on('play', function (track) {

    });

    socket.on('pause', function () {

    });

    socket.on('update', function () {

    });
});

server.listen(app.get('port'), function () {
    console.log('Listening on ' + app.get('port'));
});
console.log("Server started, brofessor.");