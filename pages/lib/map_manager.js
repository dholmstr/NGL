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
                    self._loadScript("https://maps.googleapis.com/maps/api/js?key=" + config.apiKey, function(){
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

        error: function(msg){
            // TODO: Show nicely to the user, possibly implement localization
            console.log("ERROR: " + msg);
        },

        _getWayPoints: function(){
            // TODO: Implementation
            // receive from reittiopas
            // use LatLng ?
            return [
                {
                    location: 'Albergagatan 3-9, 02600 Esbo', // LatLng || google.maps.Place ||  String
                    stopover: true  // Mandatory to include in the route
                },
                {
                    location: 'Urho Kekkonens gata 1, 00100 Helsingfors',
                    stopover: true  // Mandatory to include in the route
                }
            ];
        },

        renderRoute: function(from, to){
            var self = this;

            this.directionsService.route({
                origin: from,
                destination: to,
                waypoints: self._getWayPoints(),
                travelMode: google.maps.TravelMode.WALKING // TRANSIT
            }, function(response, status) {
                if (status === google.maps.DirectionsStatus.OK) {
                    self.directionsRenderer.setDirections(response);
                } else {
                    self.error('Directions request failed due to ' + status);
                }
            });
        }
    });