Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.MapManager',
    {
        defaults: {
            'lat': 60.169333,
            'lng': 24.933249,
            'zoom': 8
        },

        map: null,
        directionsPanel: null,
        directionsService: null,
        directionsRenderer: null,

        init: function(config, callback){
            var self = this, err = false;

            ['mapContainerId', 'directionsContainerId', 'apiKey'].forEach(function(param){
                if(!self._hasProp(config, param)){
                    return err = true;
                }
            });

            if(!err){
                ['mapContainerId', 'directionsContainerId'].forEach(function(param){
                    if(!self._isValidNodeId(config[param])){
                        return err = true;
                    }
                });

                if(!err){
                    self._loadScript("https://maps.googleapis.com/maps/api/js?libraries=geometry,places&key=" + config.apiKey, function(){
                        if(self._init(config) && typeof callback === 'function'){
                            callback();
                        }
                    });
                    return false;
                }
            }

            this.error('Invalid MapManager configuration');
        },

        _loadScript: function(source, callback){
            var script = document.createElement('script');
            var prior = document.getElementsByTagName('script')[0];
            script.async = 1;
            prior.parentNode.insertBefore(script, prior);

            script.onload = script.onreadystatechange = function( _, isAbort ) {
                if(isAbort || !script.readyState || /loaded|complete/.test(script.readyState) ) {
                    script.onload = script.onreadystatechange = null;
                    script = undefined;
                    if(!isAbort) {
                        if(callback) callback();
                    }
                }
            };
            script.src = source;
        },

        _init: function(config) {
            var mapContainer = document.getElementById(config.mapContainerId);
            this.directionsPanel = document.getElementById(config.directionsContainerId);

            this.map = new google.maps.Map(mapContainer, {
                center: {
                    lat: this._hasProp(config, 'lat') ? config.lat : this.defaults.lat,
                    lng: this._hasProp(config, 'lng') ? config.lng : this.defaults.lng
                },
                zoom: this._hasProp(config, 'zoom') ? config.zoom : this.defaults.zoom
            });

            this.directionsService = new google.maps.DirectionsService;
            this.directionsRenderer = new google.maps.DirectionsRenderer({
                'map': this.map,
                'panel': this.directionsPanel
            });

            return true;
        },

        _isValidNodeId: function(id){
            var el = document.getElementById(id);
            return el && el.toString().length > 0;
        },

        _hasProp: function(el, prop){
            return typeof el === 'object' && typeof el[prop] !== 'undefined';
        },

        _toLatLng: function(o){
            if(typeof o === 'object' && o.lat && !isNaN(o.lat) && o.lon && !isNaN(o.lon)){
                return new google.maps.LatLng(o.lat, o.lon)
            }
            this.error('Invalid location point data');
        },

        error: function(msg){
            // TODO: Show nicely to the user, possibly implement localization
            console.log("ERROR: " + msg);
        },

        renderRoute: function(from, to, waypoints){
            var self = this;

            this.directionsService.route({
                origin: self._toLatLng(from),
                destination: self._toLatLng(to),
                waypoints: waypoints,
                travelMode: google.maps.TravelMode.WALKING // TRANSIT
            }, function(response, status) {
                if (status === google.maps.DirectionsStatus.OK) {
                    self.directionsRenderer.setDirections(response);
                } else {
                    self.error('Directions request failed due to ' + status);
                }
            });
        },

        clearRoutes: function(){
            this.directionsRenderer.setDirections({routes: []});
        },

        getDistance: function(p1, p2){
            return google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
        }
    });