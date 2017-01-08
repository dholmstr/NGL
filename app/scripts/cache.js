/*
 *  Copyright 2017, Natalia Gavrilenko and Daniel Holmström
 *  Licenced under MIT licence
 *
 *  Caching app data in web browser local storage. "Static" methods are used
 *  for compatibility with callbacks
 */

Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.AppCache', {

        initKeys: function(keys){
            if(typeof keys === 'object' && keys.constructor == Array){
                AppCache.keys = keys;
            }
        }
    });

AppCache.keys = [];

AppCache.persist = function(key, value){
    if(typeof Storage !== 'undefined' && AppCache.keys.indexOf(key) != -1){
        sessionStorage.setItem(key, JSON.stringify(value));
    }
};

AppCache.getPersisted = function(key){
    if(typeof Storage !== 'undefined' && AppCache.keys.indexOf(key) != -1){
        return JSON.parse(sessionStorage.getItem(key));
    }
};

AppCache.clearPersisted = function(key){
    if(typeof Storage !== 'undefined' && AppCache.keys.indexOf(key) != -1){
        sessionStorage.removeItem(key);
    }
};

AppCache.clearAll = function(){
    if(typeof Storage !== 'undefined'){
        AppCache.keys.forEach(function(key){
            sessionStorage.removeItem(key);
        });
    }
};