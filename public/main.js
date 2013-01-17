(function (Remote, $, window) {

// Calculate minutes and seconds from seconds
function getTrackTime(time){
    var s = parseInt(time % 60);
    if(parseInt(s)<10){
        s = '0'+s;
    }
    var m = parseInt((time / 60) % 60);
    return m + ':' + s;
}

$.fn.onTap = function (action) {
    if (typeof action !== "function") {
        console.log("No callback-action provided");
        return;
    }
    var touchevent = {},
        self = $(this);

    self.on('$tap', function(e) {
        // Making sure the function isn't called more than once every 50ms
        if ( !touchevent.lastCalled || (Date.now() - touchevent.lastCalled) > 50) {
            touchevent.lastCalled = Date.now();
            return action.call(self, e);   
        }
    });
    if('ontouchstart' in window) {
        self.on('touchstart', function(event) {
            var e = event.originalEvent;
            touchevent.touchMovePos = {x:0,y:0};
            touchevent.touchStartPos = {
                x : (e.touches && e.touches[0].pageX != 0) ? e.touches[0].pageX : e.pageX,
                y : (e.touches && e.touches[0].pageY != 0) ? e.touches[0].pageY : e.pageY
            };
            touchevent.touching = true;
        });
        self.on('touchmove', function(event) {
            var e = event.originalEvent;
            touchevent.touchMovePos = {
                x : (e.touches && e.touches[0].pageX != 0) ? e.touches[0].pageX-touchevent.touchStartPos.x : e.pageX-touchevent.touchStartPos.x,
                y : (e.touches && e.touches[0].pageY != 0) ? e.touches[0].pageY-touchevent.touchStartPos.y : e.pageY-touchevent.touchStartPos.y
            };
            if(Math.abs(touchevent.touchMovePos.x)>10 || Math.abs(touchevent.touchMovePos.y)>10) {
                touchevent.touching = false;
            }
        });
        self.on('touchend', function(e) {
            if (touchevent.touching) {
                self.trigger('$tap');
            }
            return false;
        });
        self.on('click', function(e) { e.preventDefault(); });
    } else {
        self.on('click', function(e) {
            e.preventDefault();
            self.trigger('$tap');
        });
    }
}       

$.fn.onPan = function (actions) {
    if (typeof actions.started !== "function" || typeof actions.moved !== "function" || typeof actions.ended !== "function") {
        console.log("Actions have to be functions");
        return;
    }
    var self = $(this);
    self.on('touchstart mousedown', function(event) { 
        actions.started.call(self, event.originalEvent);
    });
    self.on('touchmove mousemove', function(event) { 
        actions.moved.call(self, event.originalEvent);
    });
    self.on('touchend mouseup', function(event) { 
        actions.ended.call(self, event.originalEvent);
    });
}

var Player = function (args) {
    var player = {
        $container  : args.element,
        $prevbtn    : args.element.find('.prev'),
        $playbtn    : args.element.find('.play, .pause'),
        $nextbtn    : args.element.find('.next'),
        $repeatbtn  : args.element.find('#repeat'),
        $shufflebtn : args.element.find('#shuffle'),
        $volumebar  : args.element.find('.volume'),
        $timeline   : args.element.find('#timeline-container input'),
        $duration   : args.element.find('.duration'),
        $tracklength: args.element.find('.tracklength'),
        $queuebtn   : args.element.find('.queue'),
        $currentcontainer : args.element.find('#current'),

        socket          : args.socket,
        preventtimeline : false,
        preventSearch   : false,
        queue           : null,
        searchlist      : null,
        currenttrack    : null,

        enableControls : function () {
            this.$prevbtn.attr('disabled', '').removeClass('disabled');
            this.$playbtn.attr('disabled', '').removeClass('disabled');
            this.$nextbtn.attr('disabled', '').removeClass('disabled');
        },
        disableControls: function () {
            this.$prevbtn.attr('disabled', 'disabled').addClass('disabled');
            this.$playbtn.attr('disabled', 'disabled').addClass('disabled');
            this.$nextbtn.attr('disabled', 'disabled').addClass('disabled');
        },
        setCurrentTrack: function (track) {
            if (!track || !track.artists) {
                return false;
            }
            this.queue.setCurrent(track.href);
            this.$currentcontainer.find('.song').text(track.name);
            this.$currentcontainer.find('.band').text(track.artists[0].name);
            this.currenttrack = track;
        },
        play    : function (track, emit) {
            if (emit) {
                this.socket.emit('play', track, function (err) {
                    player.$playbtn.removeClass('play').addClass('pause');
                });
            } else {
                if (track) {
                    if (!player.queue.getTrackByURI(track.href)) {
                        player.queue.add(track);
                    }
                    player.setCurrentTrack(track);
                } else {
                    // No track specified, unpause current
                }
                player.$playbtn.removeClass('play').addClass('pause');
                // Update album art
            }
        },
        pause   : function (emit) {
            // pause visuals
            if (emit) {
                this.socket.emit('pause', function (err) {
                    player.$playbtn.addClass('play').removeClass('pause');
                });
            } else {
                player.$playbtn.addClass('play').removeClass('pause');
            }
        },
        addToQueue: function (track) {
            this.socket.emit('queue', track, function (err) {

            });
        },
        updateTime: function (time, emit) {
            if (emit) {
                this.socket.emit('updateTime', function (err) {

                });
            } else {
                var pos = (time/player.currenttrack.length)*1000;
                this.$timeline.val(pos);
            }
        },
        updateVolume: function (volume, emit) {
            if (emit) {
                this.socket.emit('updateVolume', function (err) {

                });
            } else {
                this.$volumebar.val(volume);
            }  
        },
        previous: function (emit) {
            if (emit) {
                this.socket.emit('previous', function (err) {

                });    
            }
            
        },
        next    : function (emit) {
            if (emit) {
                this.socket.emit('next', function (err) {

                });    
            }
        },

        init : function () {
            this.socket.on('init', function (initData) {
                player.currenttrack = initData.current;
                player.queue.update(initData.queue);
                player.queue.setCurrent(player.currenttrack.href);
            });

            this.queue      = new TrackList({
                element: this.$container.find('#main'),
                tracks : args.tracks,
                trackDoubleClick : function (event, track) {
                    player.play(track, true);
                }
            });

            this.searchlist = new TrackList({
                element: this.$container.find('#search-section'),
                tracks : [],
                trackDoubleClick : function (event, track) {
                    player.addToQueue(track);
                }
            });

            this.searchbar  = new SearchBar({
                element: this.$container.find('#header')
            });

            this.$queuebtn.onTap(function () {
                player.searchlist.hide();
                player.queue.show();
            });

            this.$prevbtn.onTap(function () {
                player.previous(true);
            });

            this.$playbtn.onTap(function () {
                if (this.hasClass('play'))
                    player.play(null, true);
                else
                    player.pause(true);
            });

            this.$nextbtn.onTap(function () {
                player.next(true);
            });

            this.$volumebar.onPan({
                started : function () {
                    player.preventvolume = true;
                },
                moved   : function () {

                },
                ended   : function () {
                    player.preventvolume = false;
                    var currentVolume = this.val();
                    player.updateVolume(currentVolume, true);
                }
            });

            this.$timeline.onPan({
                started : function () {
                    player.preventtimeline = true;
                },
                moved   : function () {
                    
                },
                ended   : function () {
                    player.preventtimeline = false;
                    var currentTime = this.val();
                    player.updateTime(currentTime, true);
                }
            });

            this.$container.on('clickedTrack', function (event, track) {
                player.play(track, true);
            });

            this.$container.on('searchQuery', function (event, query) {
                if (player.preventSearching) {
                    return false;
                }
                player.preventSearching = true;
                player.socket.emit('search', query, function (err, results) {
                    if(err) {
                        console.log("Error: ", err);
                    } else {
                        player.searchlist.update(results.track.tracks);
                        player.queue.hide();
                        player.searchlist.show();
                    }
                    
                    player.preventSearching = false;
                });
            });

            this.socket.on('play', function (track) {
                if (track) {
                    player.play(track);
                } else {
                    player.play(null);
                }
            });

            this.socket.on('queue', function (tracklist) {
                player.queue.update(tracklist);
            });

            this.socket.on('pause', function () {
                player.pause();
            });

            this.socket.on('updateTime', function (time) {
                if (!player.preventtimeline)
                    player.updateTime(time);
            });

            this.socket.on('updateVolume', function (volume) {
                if (!player.preventvolume)
                    player.updateVolume(volume);
            });

            return this;
        }
    };
    return player.init();
},

SearchBar = function (args) {
    var searchbar = {
        $container  : args.element,
        $form       : args.element.find('#search'),
        $field      : args.element.find('#search-field'),
        $button     : args.element.find('button'),

        showResults : function (results) {
            this.$container.trigger('searchResults', results);
        },
        init    : function () {
            searchbar.$form.on('submit', function (event) {
                event.preventDefault();
                var query = searchbar.$field.val();
                searchbar.$container.trigger('searchQuery', query);
            });

            return searchbar;
        }
    }

    return searchbar.init();
},

TrackList = function (args) {
    var tracklist = {
        $container  : args.element,
        $currentart : args.element.find('.queue-cover'),
        $list       : args.element.find('.tracklist'),
        tracks      : args.tracks || [],

        trackDoubleClick: args.trackDoubleClick || function () {},

        show        : function () {
            this.$container.removeClass("is-hidden");
        },
        hide        : function () {
            this.$container.addClass("is-hidden");
        },
        getTrackByURI: function (URI) {
            var returnObj = false;
            $.each(tracklist.tracks, function (i, track) {
                if (track.href === URI) {
                    var DOMTrack = tracklist.getDOMTrack(track.href);
                    returnObj = {
                        track   : track, 
                        index   : i,
                        DOM     : DOMTrack
                    };
                }
            });
            return returnObj;
        },
        getDOMTrack     : function (uri) {
            var returnObj = false;
            tracklist.$list.children().each(function (i, DOMTrack) {
                if (DOMTrack.id === uri) {
                    returnObj = $(DOMTrack);
                    return false;
                }
            });
            return returnObj;
        },
        _DOMTrack   : function (track) {
            var domString, 
                track, 
                starred = (track.starred) ? "stared" : "",
                artist  = (track.artists) ? track.artists[0].name : "unknown",
                duration = getTrackTime(+track.length);
            domString += '<tr id="'+track.href+'" class="track">';
            domString +=    '<td class="star"><a class="'+starred+'" href="#">&#9733;</a></td>';
            domString +=    '<td><a rel="song" href="'+track.href+'">'+track.name+'</a></td>';
            domString +=    '<td></td>';
            domString +=    '<td><a href="#">'+artist+'</a></td>';
            domString +=    '<td class="right">'+duration+'</td>';
            domString +=    '<td><a href="'+track.album.href+'">'+track.album.name+'</a></td>';
            domString +=    '<td></td>';
            domString += '</tr>';
            $track = $(domString);
            $track.data('track', track);
            return $track;
        },

        add         : function (track) {
            var $track = this._DOMTrack(track);
            this.$list.append($track);
            this.tracks.push(track);
        },
        
        remove  : function (track) {
            var trackObj = tracklist.getTrackByURI(track.uri);
            if (trackObj) {
                var trackIndex = trackObj.index;
                tracklist.tracks.splice(trackIndex+1, 1);
                trackObj.DOM.remove();
            } else {
                console.log("Track not found in list");
                return false;
            }
        },
        
        update      : function (tracks) {
            this.$list.children().remove();
            this.tracks.splice(0, this.tracks.length-1);
            $.each(tracks, function (i, track) {
                var $track = tracklist._DOMTrack(track),
                    track = tracks[i];
                tracklist.$list.append($track);
                tracklist.tracks.push(track);
            });
        },

        setCurrent : function (uri) {
            var trackObj = this.getTrackByURI(uri);
            tracklist.$list.children().removeClass('current');
            if(trackObj) {
                trackObj.DOM.addClass('current');
            }
        },

        init : function () {
            var clickEvent = {};
            tracklist.$list.on('click', 'tr.track', function (event) {
                event.preventDefault();
                var $target = $(this);
                if($target.hasClass('track')) {
                    var track = $target.data('track');
                    if (clickEvent.$target && clickEvent.$target.data('track').href === track.href) {
                        tracklist.trackDoubleClick.call(this, event, track);
                    } else {
                        tracklist.$list.children().removeClass('selected');
                        $target.addClass('selected');
                        clickEvent.$target = $target;
                        clearTimeout(clickEvent.doubleTimeout);
                        clickEvent.doubleTimeout = setTimeout(function () {
                            clickEvent.$target = false;
                        }, 400);
                    }
                }
            });

            return this;
        }
    };
    return tracklist.init();
},

UserList = function () {
    var userlist = {


        init : function () {
            return userlist.init();
        }
    }

    return userlist;
};



function init () {
    var socket = io.connect();
    socket.on('connect', function () {
        Remote.player = new Player({
            element: $('.spotify-remote'), 
            socket : socket
        });
    });

    socket.on('error', function () {
        // Present cute error modal
    });

}

$(init());

})(window.Remote = window.Remote || {}, jQuery, window);