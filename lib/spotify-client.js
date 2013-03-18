var Queue       = require("./queue"),
    Spotify     = require("spotify-web"),
    Speaker     = require("speaker"),
    parseXML    = require("xml2js").parseString,
    lame        = require("lame"),
    util        = require("util"),
    EventEmitter = require("events").EventEmitter,
    xmlOpts     = {explicitArray: false};

/**
 * Events:
 *
 * disconnect - Lost connection to spotify
 * pause - Playback was paused
 * resume - Playback was resumed
 * track - A new track is playing
 * error - You should know this one
 */
 
function Client () {
    EventEmitter.call(this);
    
    this._id2uri    = Spotify.id2uri;
    this._queue     = null;
    this._spotify   = null;
    this._speaker   = new Speaker();

    // Class.prototype.namespace = { method: function } - syntax in order
    // to call as client.queue.add gets 'this' wrong because
    // of the object-literal, but I like the way it looks
    var self = this;
    this.queue = {
        tracks  : function () {
            return self._queue.getTracks();
        },
        current : function () {
            return self._queue.currentTrack();
        },
        add     : function (track) {
            self._queue.add(track);
        },
        remove  : function (track) {
            self._queue.remove(track);
        }
    };
}

util.inherits(Client, EventEmitter);

Client.prototype.login = function (username, password, fn) {
    var self = this;

    Spotify.login(username, password, function (err, spot) {
        if (err) return fn(err);

        self._spotify = spot;
        self._queue = new Queue();
        // TODO: add fetching of playlists
        fn(null);
    });
}

Client.prototype.logout = function () {
    if (this._spotify.connected) {
        this._spotify.disconnect();
    }
    this.emit('disconnect');
}

Client.prototype._parseResults = function (searchType, data, fn) {
    var self = this,
        results = {
            tracks : [],
            artists: [],
            albums : []
        };

    parseXML(data, xmlOpts, function (err, data) {
        if (err) return fn(err);
        switch (searchType) {
            case "tracks":
                results.tracks = data.result.tracks.track;
                break;
            case "albums":
                results.albums = data.result.albums.album;
                break;
            case "artists":
                results.artists = data.result.artists.artist;
                break;
            case "all":
                results.artists = data.result.artists.artist;
                results.albums  = data.result.albums.album;
                results.tracks  = data.result.tracks.track;
                break;
        }

        for (var type in results) {
            // Singular in URI-type
            var uriType = type.substring(0, type.length-1);
            // Handling cases where the XML-parser doesn't parse as array
            if (!Array.isArray(results[type])) {
                results[type] = [ results[type] ];
            }
            results[type].map(function(item) {
                item.uri = Spotify.id2uri(uriType, item.id);
                return item;
            });
        }
        return fn(null, results);
    });
}

Client.prototype.search = function (opts, fn) {
    var self = this;
    this._spotify.search(opts, function (err, results) {
        if(err) return fn(err);
        self._parseResults(opts.type, results, fn);
    });
}

/**
 * Plays a track with an optional context
 * @param  {Track}  track   Any given track
 * @param  {Array}  context Optional context of tracks 
 * (E.G: the search results containing the track)
 */
Client.prototype.playTrack = function (track, context) {
    if (context) {
        this._queue.clear();
        this._queue.add(context);
        this._queue.setTrack(track);
        this.play();
    } else {
        var isQueued = this._queue.getTrack(track);
        if (isQueued) {
            this._queue.setTrack(track);
            this.play();
        }
    }
}

Client.prototype.play = function () {
    var current = this._queue.getCurrentTrack(),
        self    = this;

    // TODO: Find a way to play from position in song
    // Add resume event when resuming instead of only playing new
    this._spotify.get(current.uri, function (err, track) {
        if (err) {
            self.emit('error', err);
            return;
        }
        var decoder = new lame.Decoder();
        self._speaker.close();
        self._speaker._closed = false;

        track.play()
            .pipe(decoder)
            .pipe(self._speaker)
            .on('finish', function () {
                self.next();
            })
            .on('error', function (err) {
                self.emit('error', err);
            });
        self.emit('track', track);
    });
}

Client.prototype.pause = function () {
    // TODO: Find a way to maintain the position of the stream
    this.emit('pause');
}

Client.prototype.next = function () {
    this._queue.next();
    this.play();
}

Client.prototype.prev = function () {
    this._queue.prev();
    this.play();
}


module.exports = Client;