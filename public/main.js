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
        $playbtn    : args.element.find('.play'),
        $nextbtn    : args.element.find('.next'),
        $repeatbtn  : args.element.find('#repeat'),
        $shufflebtn : args.element.find('#shuffle'),
        $volumebar  : args.element.find('.volume'),
        $timeline   : args.element.find('#timeline-container input'),
        $duration   : args.element.find('.duration'),
        $tracklength: args.element.find('.tracklength'),

        socket          : args.socket,
        preventtimeline : false,
        tracklist       : null,
        searchlist      : null,
        currenttrack    : {name: "asd"},

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
        play    : function (track, emit) {
            track = track || this.currenttrack;
            if (!track)
                return false;

            if (emit) { 
                this.socket.emit('play', track, function (err) {
                    console.log("wut");
                });
            } else {
                if (player.queue.getTrackByURI(track.uri))
                    player.queue.setCurrent(track.uri);
                else {
                    player.queue.push(track);
                    player.queue.setCurrent(track.uri);
                }
                this.currenttrack = track;
                this.removeClass('pause').addClass('play');
                // Update album art
            }
        },
        pause   : function (emit) {
            // pause visuals
            if (emit) {
                this.socket.emit('pause', function (err) {

                });
            } else {
                this.addClass('pause').removeClass('play');
            }
        },
        updateTime: function (time, emit) {
            if (emit) {
                this.socket.emit('updateTime', function (err) {

                });
            } else {
                this.$timeline.val(time);
            }
        },
        updateVolume: function (volume, emit) {
            if (emit) {
                this.socket.emit('updateTime', function (err) {

                });
            } else {
                this.$volumebar.val(volume);
            }  
        },
        previous: function (emit) {
            if (emit) {
                this.socket.emit('previous', function (err) {

                });    
            } else {
                // Update the play queue
            }
            
        },
        next    : function (emit) {
            if (emit) {
                this.socket.emit('next', function (err) {

                });    
            } else {
                // Update the play queue
            }
            
        },

        init : function () {
            this.queue      = new TrackList({
                element: this.$container.find('#playlist'),
                tracks : args.tracks
            });

            this.searchlist = new TrackList({
                element: this.$container.find('#searchfield'),
                tracks : []
            });

            this.$prevbtn.onTap(function () {
                player.previous(true);
            });

            this.$playbtn.onTap(function () {
                if (this.hasClass('play'))
                    player.play(null, true);
                else
                    player.pause(null, true);
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

            this.$container.on('updateTrack', function (event) {
                var uri = $(event.target).data('uri');
                var track = player.queue.getTrackByURI(uri);
                player.play(track, true);
            });

            this.socket.on('play', function (track) {
                player.play(null);
            });

            this.socket.on('newTrack', function (track) {
                player.play(track);
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

TrackList = function (args) {
    var tracklist = {
        $container  : args.element,
        $currentart : args.element.find('.queue-cover'),
        $list  : args.element.find('.tracklist'),
        tracks      : args.tracks,

        show        : function () {
            this.$container.show();
        },
        hide        : function () {
            this.$container.hide();
        },
        getTrackByURI: function (URI) {
            var returnObj = null;
            $.each(this.tracks, function (i, track) {
                if (track.uri === URI) {
                    returnObj = {
                        track: track, 
                        index: i
                    };
                }
            });
            return returnObj;
        },

        update      : function (tracks) {
            this.$list.children().remove();
            $.each(tracks, function (i, track) {
                var domString, 
                    track, 
                    starred = (track.starred) ? "stared" : "";

                domString += '<tr>';
                domString +=    '<td class="star"><a class="'+starred+'" href="#">&#9733;</a></td>';
                domString +=    '<td><a rel="song" href="'+track.uri+'">'+track.name+'</a></td>';
                domString +=    '<td></td>';
                domString +=    '<td><a href="#">'+track.artist+'</a></td>';
                domString +=    '<td class="right">'+track.duration+'</td>';
                domString +=    '<td><a href="#">'+track.album+'</a></td>';
                domString +=    '<td></td>';
                domString += '</tr>';
                $track = $(domString);
                $track.data('track', track);
                tracks[i].DOM = $track;
                tracklist.$list.append($track);
            });

            this.tracks = tracks;
        },

        remove  : function (track) {
            var trackObj = tracklist.getTrackByURI(track.uri);
            if (trackObj) {
                var trackIndex = trackObj.index;
                tracklist.tracks.splice(trackIndex+1, 1);
            } else {
                console.log("Track not found in list");
                return false;
            }
        },
        setCurrent : function (uri) {
            var track = this.getTrackByURI(uri).track;
            track.DOM.addClass('current');
        },

        init : function () {
            tracklist.$list.onTap(function (event) {
                var $target = $(event.target);
                if($target.hasClass('track')) {
                    $target.trigger('updateTrack');
                }
            });

            return this;
        }
    };
    return tracklist.init();
};

function init () {
    var socket = io.connect('http://localhost:5000');
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


// Object.prototype.resizable = function(sibling, handles){
//     for (var i = 0; i < handles.length; i++) {
//         var obj = this,
//         direction = handles[i],
//         interval,
//         handle = document.createElement('span').prop({'draggable':'true','className':direction+'-resize'}).appendTo(obj),
//         start;
//         handle.addEventListener('dragstart', function (event) {
//             start = event.pageX;
//             this.addClass('dragging');
//         }, false).addEventListener('dragend', function (event) {
//             this.removeClass('dragging');
//             if(direction == 'w'){
//                 obj.style.width = aside.clientWidth+(start-event.pageX)+'px';
//                 sibling.style.right = obj.style.width;
//             } else if(direction == 'e'){
//                 obj.style.width = aside.clientWidth+(event.pageX-start)+'px';
//                 sibling.style.left = obj.style.width;
//             }
//         });     
//     }
// };
// document.addEventListener('DOMContentLoaded', function(){
//     var player = new Player('#player');
//     document.body.addEventListener('click', function(e){
//         if(e.target.tagName === 'A' && e.target.rel === 'song'){
//             e.preventDefault();
//             player.loadSrc(e.target.href, function(){
//                 player.setCurrent(e.target.parentNode.parentNode);
//                 player.play();
//             });
//         }
//     }).addEventListener('dragover', function(e){
//         e.preventDefault();
//         this.addClass('dragover');
//         return false;
//     }).addEventListener('dragend', function(e){
//         e.preventDefault();
//         this.removeClass('dragover');
//         return false;
//     }).addEventListener('drop', function(e){
//         e.preventDefault();
//         var file = e.dataTransfer.files[0];
//         var reader = new FileReader();
//         reader.onload = function(ev){
//             alert(ev.target.result);
//         }
//         reader.readAsDataURL(file);
//         return false;               
//     }, false);
//     var main = document.getElementById('main'),
//     nav = document.getElementById('playlists').resizable(main, ['e']),
//     aside = document.getElementById('aside').resizable(main, ['w']);
// }, false);



})(window.Remote = window.Remote || {}, jQuery, window);