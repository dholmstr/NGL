/*
 *  Copyright 2017, Natalia Gavrilenko and Daniel Holmström
 *  Licenced under MIT licence
 */

head.load([
    "app/scripts/lib/jquery.js",
    "app/scripts/lib/class_manager.js",
    "app/scripts/cache.js",
    "app/scripts/digitransit.js",
    "app/scripts/manager.js",
    "app/scripts/map.js",
    "app/scripts/translator.js",
    "app/scripts/speech_recognition.js"
], function() {
    $(document).on('ready', function(){
        var manager = new Manager();
    });
});