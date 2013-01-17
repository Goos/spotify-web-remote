var express         = require("express"),
    sio             = require("socket.io"),
    http            = require("http"),
    helper          = require("./helper"),
    spotify         = require("spotify-node-applescript"),
    spotifyAPI      = require("spotify"),
    tracklist       = require("./tracklist");

var app             = express();
var server          = http.createServer(app);
var spotifyClient   = {};

spotifyClient.queue     = new tracklist();
spotifyClient.volume    = 100;
spotifyClient.state     = "paused";
spotifyClient.timeline  = 0;
spotifyClient.repeat    = false;
spotifyClient.shuffle   = false;

app.configure(function () {
    app.set('port', 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {
        pretty: true
    });
    app.use(express.static(__dirname + '/public'));
});

app.get('/', function (req, res) {
    var options = {
        player  : {
            volume  : spotifyClient.volume,
            playing : spotifyClient.state === "playing",
            shuffle : spotifyClient.shuffle,
            repeat  : spotifyClient.repeat
        },
        currentTrack: spotifyClient.queue.getCurrentTrack(),
        queue       : spotifyClient.queue.getTracks()
    };

    res.render('index', options);
});

var sio = sio.listen(server, {log: false});

sio.on('connection', function (socket) {
    var currTrack = spotifyClient.queue.getCurrentTrack(),
        queue   = spotifyClient.queue.getTracks();
    if (currTrack) {
        socket.emit('init', {queue: queue, current: currTrack});
    }

    socket.on('play', function (track, callback) {
        if (track) {
            spotifyClient.queue.setTrack(track);
            var currentTrack = spotifyClient.queue.getCurrentTrack();
            spotify.playTrack(currentTrack.href, function () {
                helper.logTrack(currentTrack);
                socket.emit('play', currentTrack, function () {

                });
                callback();
            });
        } else {
            var currentTrack = spotifyClient.queue.getCurrentTrack();
            spotify.play(function () {
                helper.logTrack(currentTrack);
                socket.emit('play', currentTrack, function () {

                });
                callback();
            });
        }
    });

    socket.on('pause', function (callback) {
        console.log("Paused");
        spotify.pause(function () {
            callback();
        });
    });

    socket.on('next', function (callback) {
        var track = spotifyClient.queue.next();
        spotify.playTrack(track.href, function () {
            sio.sockets.emit('play', track);
            callback();
        });
    });

    socket.on('previous', function (callback) {
        var track = spotifyClient.queue.prev();
        spotify.playTrack(track.href, function () {
            sio.sockets.emit('play', track);
            callback();
        });
    });

    socket.on('queue', function (track, callback) {
        if (track && track.href) {
            spotifyClient.queue.add(track);
            callback();
            var queue = spotifyClient.queue.getTracks();
            sio.sockets.emit('queue', queue);
        }
        else
            callback("Error: must specify a track to queue");
    });

    socket.on('search', function (query, callback) {
        var queries = [
            {type: "track", query: query},
            {type: "album", query: query},
            {type: "artist", query: query}
        ], 
            counter = 0,
            results = {};

        for(var i = 0; i < queries.length; i++) {
            spotifyAPI.search(queries[i], handleQueries);
        }
        function handleQueries (err, response) {
            counter++;
            if (err)
                callback(err);
            else {
                var type = response.info.type;
                results[type] = response;
            }
            if (counter === 3) {
                callback(null, results);
            }
        }
    });
});

var poller = setInterval(function () {
    spotify.getState(function (err, status) {
        if (!status)
            return false;
        if (status.volume !== spotifyClient.volume) {
            sio.sockets.emit('updateVolume', status.volume);
            spotifyClient.volume = status.volume;
        }
        if (status.state !== spotifyClient.state) {
            if (status.state === "playing") {
                var currentTrack = spotifyClient.queue.getCurrentTrack();
                sio.sockets.emit('play', currentTrack);
            }
            else
                sio.sockets.emit('pause');
            spotifyClient.state = status.state;
        }
        if (status.state === "playing") {
            spotifyClient.timeline = status.position;
            var currentTrack = spotifyClient.queue.getCurrentTrack();
            if (currentTrack && spotifyClient.timeline >= currentTrack.length-2) {
                var nextTrack = spotifyClient.queue.next();
                if (!nextTrack) {
                    if (spotifyClient.repeat) {
                        var firstTrack = spotifyClient.queue.setTrack(0);
                        spotify.playTrack(firstTrack.href, function () {
                            sio.sockets.emit('play', firstTrack);
                        });
                    } else {
                        spotify.pause(function () {
                            spotifyClient.state = "paused";
                        });
                        console.log("Stopped");
                        sio.sockets.emit('pause');
                    }
                } else {
                    spotify.playTrack(nextTrack.href, function () {
                        sio.sockets.emit('play', nextTrack);
                    });    
                }
                
            } else {
                sio.sockets.emit('updateTime', status.position);
            }
        }
    });
}, 1000);

server.listen(app.get('port'), function () {
    console.log('Listening on ' + app.get('port'));
    spotify.open();
});
console.log("Server started, brofessor.");