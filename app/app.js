/*
 *  Copyright 2017, Natalia Gavrilenko and Daniel Holmström
 *  Licenced under MIT licence
 */

head.load([
    "app/scripts/lib/jquery.js",
    "app/scripts/lib/class_manager.js",
    "app/scripts/cache.js",
    "app/scripts/digitransit_manager.js",
    "app/scripts/manager.js",
    "app/scripts/map_manager.js",
    "app/scripts/translator.js"
], function() {
    $(document).on('ready', function(){
        var manager = new Manager();
    });
});