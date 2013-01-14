module.exports.getTrackTime = function (time) {
    var s = parseInt(time % 60);
    if(parseInt(s)<10){
        s = '0'+s;
    }
    var m = parseInt((time / 60) % 60);
    return m + ':' + s;
}
module.exports.logTrack = function (track) {
    try {
        console.log("Playing: "+track.name+" - "+track.artists[0].name);    
    } catch (e) {
        console.log(e);
    }
}