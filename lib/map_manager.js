Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.MapManager',
    {
        defaults: {
            'mapContainerId': '',
            'lat': 60.169333,
            'lng': 24.933249,
            'zoom': 15
        },

        // TODO: Adequate styles
        styles: {
            'WALK': {
                strokeColor: '#00008B',
                strokeOpacity: 1.0,
                strokeWeight: 4
            },
            'BUS': {
                strokeColor: '#FF0000',
                strokeOpacity: 0.9,
                strokeWeight: 5
            },
            'ACTIVE': {
                strokeColor: '#000000',
                strokeOpacity: 1.0,
                strokeWeight: 4
            },
            'DEFAULT': {
                strokeColor: '#00FF00',
                strokeOpacity: 1.0,
                strokeWeight: 4
            }
        },

        map: null,
        route: null,
        directionsPanel: null,
        directionsService: null,
        placeService: null,
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

            script.onload = script.onreadystatechange = function(_, isAbort) {
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
            this._updateDefaults(config);
            this.initMap();

            this.placeService = new google.maps.places.PlacesService(this.map);
            this.directionsPanel = document.getElementById(config.directionsContainerId);
            this.directionsService = new google.maps.DirectionsService;
            this.directionsRenderer = new google.maps.DirectionsRenderer({
                polylineOptions: this.styles.ACTIVE
            });
            return true;
        },

        _updateDefaults: function(config){
            this.defaults.mapContainerId = config.mapContainerId;
            this.defaults.lat = this._hasProp(config, 'lat') ? config.lat : this.defaults.lat;
            this.defaults.lng = this._hasProp(config, 'lng') ? config.lng : this.defaults.lng;
            this.defaults.zoom = this._hasProp(config, 'zoom') ? config.zoom : this.defaults.zoom;
        },

        initMap: function(){
            this.map = new google.maps.Map(document.getElementById(this.defaults.mapContainerId), {
                center: {
                    lat: this.defaults.lat,
                    lng: this.defaults.lng
                },
                zoom: this.defaults.zoom
            });
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

        _showOwnLocation: function(){
            // TODO: Implementation
            console.log('Show own location called');
            // If has location
                // draw location on the map
                // if location is within distance to the current polyline
                    // fit bounds
        },

        _activateSegment: function(index){
            if(this._hasProp(this.route[index], 'poly')){
                var bounds = new google.maps.LatLngBounds();
                this.route[index].poly.getPath().getArray().forEach(function(v){
                    bounds.extend(v);
                });
                this.route[index].poly.setOptions(this.styles.ACTIVE);
                this.map.fitBounds(bounds);
            }
        },

        hideSegment: function(index){
            if(this._hasProp(this.route[index], 'poly') && typeof this.route[index].poly.setMap === 'function'){
                this.route[index].poly.setMap(null);
            }
            this.directionsRenderer.setMap(null);
            this.directionsRenderer.setPanel(null);
        },

        error: function(msg){
            // TODO: Show nicely to the user, possibly implement localization
            console.log("ERROR: " + msg);
        },

        clear: function(){
            this.directionsRenderer.setMap(null);
            this.directionsRenderer.setPanel(null);
            if(typeof this.route === 'object'){
                var self = this;
                this.route.forEach(function(v){
                    if(self._hasProp(v, 'poly') && typeof v.poly.setMap === 'function'){
                        v.poly.setMap(null);
                    }
                });
                this.route = null;
            }
        },

        renderRoute: function(route){
            var self = this,
                config = {},
                bounds = new google.maps.LatLngBounds();

            route.forEach(function(v, i){
                config = typeof self.styles[v.mode] !== 'undefined' ? self.styles[v.mode] : self.styles.DEFAULT;
                config.path = google.maps.geometry.encoding.decodePath(v.legGeometry.points);
                route[i].poly = new google.maps.Polyline(config);
                route[i].poly.setMap(self.map);

                v.poly.getPath().getArray().forEach(function(v){
                    bounds.extend(v);
                });
            });

            this.map.fitBounds(bounds);
            this.route = route;
        },

        toSegment: function(index){
            this.hideSegment(index - 1);
            if(typeof this.route === 'object' && typeof this.route[index] === 'object'){
                if(this.route[index].mode === 'WALK'){
                    this.route[index].poly.setMap(null);
                    this.renderDirections(this.route[index].from, this.route[index].to);
                } else {
                    this._activateSegment(index);
                }

                // TODO: Where is the best place for it?
                this._showOwnLocation();
                return;

            } else if(index == this.route.length){
                // TODO: Implementation
                console.log('You are at destination');
            }

            this.error('Invalid route data');
        },

        renderDirections: function(from, to, waypoints){
            var self = this;
            this.directionsService.route({
                origin: self._toLatLng(from),
                destination: self._toLatLng(to),
                waypoints: waypoints,
                travelMode: google.maps.TravelMode.WALKING
            }, function(response, status) {
                if (status === google.maps.DirectionsStatus.OK) {
                    self.directionsRenderer.setMap(self.map);
                    self.directionsRenderer.setPanel(self.directionsPanel);
                    self.directionsRenderer.setDirections(response);
                } else {
                    self.error('Directions request failed due to ' + status);
                }
            });
        },

        getPlace: function(query, handler, callback){
            var place = null;
            this.placeService.textSearch({query: query}, function(results, status){
                if(status == google.maps.places.PlacesServiceStatus.OK
                    && typeof results === 'object' && typeof results[0] === 'object'){
                    place = results[0];
                }
                callback(place, handler);
            });
        }
    });