function TrackList (tracks) {
    /**
     * Arrays :
     * @queue      - The tracks after the current track
     * @history    - The tracks that have recently been played (in order to have a proper prev-function)
     * @currentTrack    - The currently playing track
     */
    var arrays = {
        history     :   [],
        queue       :   []
    },
    currentTrack = null,
    currentIndex = 0;
    
    this.getTracks      = function () {
        return arrays.queue;
    }

    this.getFirstTrack  = function () {
        if (arrays.queue[0])
            return arrays.queue[0];
        else
            return false;
    }

    this.getCurrentTrack = function () {
        if (currentTrack)
            return currentTrack;
        else if (arrays.queue.length > 0)
            return this.setTrack(0);
        else
            return false;
    }

    this.next = function () {
        arrays.history.push(currentTrack);
        if (arrays.queue[currentIndex+1]) {
            currentIndex++;
            currentTrack = arrays.queue[currentIndex];
            return currentTrack;    
        }
        else {
            return false;
        }
    }

    this.prev = function () {
        if (arrays.history[arrays.history.length-1]) {
            currentTrack = arrays.history.pop();
            currentIndex--;
            return currentTrack;
        } else {
            return false;
        }
    }

    this.setTrack = function (identifier) {
        if (!identifier)
            return false;
        if (typeof identifier === "number") {
            if (currentTrack)
                arrays.history.push(currentTrack);

            currentIndex = identifier;
            currentTrack = arrays.queue[identifier];
            return currentTrack;
        } else {
            var trackInArray = this.getTrack(identifier.href);
            if (!trackInArray) {
                this.add(identifier, 0);
            }
            var index = (trackInArray) ? trackInArray.index : 0;

            if (currentTrack)
                arrays.history.push(currentTrack);
            currentIndex = index;
            currentTrack = arrays.queue[index];
            return currentTrack;
        }
    }
    /**
     * Fetches a track with the given URI, false if none is found
     * @param  {string, [int]} identifier  The tracks spotify-uri, or its index
     * @return {Object [bool]}       Array containing the given track & its index in the queue, or false
     */
    this.getTrack   = function (identifier) {
        if (!identifier)
            return false;

        if(typeof identifier === "number") {
            return arrays.queue[identifier];
        } 
        else if (typeof identifier === "string") {
            for(var i = 0; i < arrays.queue.length; i++) {
                var track = arrays.queue[i];
                if (track && track.href === identifier) {
                    return {info: track, index: i};
                }
            }
        }    
    }
    this.add = function (tracks, position) {
        if (!tracks)
            return false;
        if (tracks.isArray) {
            forEach(tracks, function (index, track) {
                // in case of position === 0
                if (typeof position === "number") {
                    arrays.queue.splice(position+i, 0, track);
                } else {
                    arrays.queue.push(track);
                }
            });
        } 
        else {
            if (typeof position === "number") {
                arrays.queue.splice(position, 0, tracks);
            } else {
                arrays.queue.push(tracks);
            }
        }
        if (arrays.queue.length === 1) {
            currentTrack = arrays.queue[0];
            currentIndex = 0;
        }
        return arrays.queue;
    }
    /**
     * Removes the specified track from the queue
     * @param  {Object, [index]} identifier     The track in question's, uri or index
     * @return {Array [bool]}                   The queue, or bool on bad argument
     */
    this.remove  = function (identifier, amount) {
        // Identifier is index
        if (typeof identifier === "number") {
            amount = amount || 1;
            arrays.queue.splice(identifier-1, amount);
            return arrays.queue;
        }
        else if (typeof identifier === "object" && identifier !== null) {
            var track = this.getTrack(track.href);
            if (track) {
                var index = track.index;
                arrays.queue.splice(index-1, 1);
                delete track;
                return arrays.queue;
            }
        }
        return false;
    }

    /**
     * Clears the entire queue
     * @return {Array} The empty queue
     */
    this.clear   = function () {
        forEach(arrays, function (key, array) {
            array.splice(0, array.length-1);
        });
        
        currentTrack = null;

        return arrays;
    }
}

module.exports = TrackList;
