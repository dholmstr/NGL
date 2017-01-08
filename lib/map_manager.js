/*
 *  Copyright 2017, Natalia Gavrilenko and Daniel Holmström
 *  Licenced under MIT licence
 */

Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.MapManager',
    {
        defaults: {
            'mapContainerId': '',
            'buttonNextId': '',
            'buttonBackId': '',
            'lat': 60.169333,
            'lng': 24.933249,
            'zoom': 15,

            location: {
                icon: window.location + 'img/location.svg',
                options: {
                    enableHighAccuracy: true,
                    maximumAge        : 30000,
                    timeout           : 27000
                }
            }
        },

        styles: {
            'WALK': {
                strokeColor: '#036c93',
                strokeOpacity: 1.0,
                strokeWeight: 4
            },
            'BUS': {
                strokeColor: '#F36D3F',
                strokeOpacity: 1.0,
                strokeWeight: 4
            },
            'ACTIVE': {
                strokeColor: '#1ca8dd',
                strokeOpacity: 1.0,
                strokeWeight: 7
            },
            'DEFAULT': {
                strokeColor: '#454a58',
                strokeOpacity: 1.0,
                strokeWeight: 4
            }
        },

        map: null,
        route: null,

        buttonNext: null,
        buttonBack: null,

        geolocation: null,
        geolocationInterval: null,
        marker: null,

        directionsPanel: null,
        directionsService: null,
        placeService: null,
        directionsRenderer: null,

        init: function(config, callback){
            var self = this, err = false;

            ['mapContainerId', 'buttonNextId', 'buttonBackId', 'directionsContainerId', 'apiKey'].forEach(function(param){
                if(!self._hasProp(config, param)){
                    return err = true;
                }
            });

            if(!err){
                ['mapContainerId', 'buttonNextId', 'buttonBackId', 'directionsContainerId'].forEach(function(param){
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

            this.buttonNext = document.getElementById(config.buttonNextId);
            this.buttonBack = document.getElementById(config.buttonBackId);

            this.marker = new google.maps.Marker({
                icon: this.defaults.location.icon
            });

            this.placeService = new google.maps.places.PlacesService(this.map);
            this.directionsPanel = document.getElementById(config.directionsContainerId);
            this.directionsService = new google.maps.DirectionsService;
            this.directionsRenderer = new google.maps.DirectionsRenderer({
                polylineOptions: JSON.parse(JSON.stringify(this.styles.ACTIVE)),
                suppressMarkers: true
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
                config = JSON.parse(JSON.stringify(typeof self.styles[v.mode] !== 'undefined' ? self.styles[v.mode] : self.styles.DEFAULT));
                config.path = google.maps.geometry.encoding.decodePath(v.legGeometry.points);
                route[i].poly = new google.maps.Polyline(config);
                route[i].poly.setMap(self.map);

                v.poly.getPath().getArray().forEach(function(v){
                    bounds.extend(v);
                });
            });

            this.map.fitBounds(bounds);
            this.initLocation(this.fitLocationBounds);
            this.route = route;
            this.handleSegmentNav(-1);
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
                    self.directionsRenderer.setDirections(response, function(){
                        console.log('ready');
                        console.log($('#map-directions-container').find('.adp-directions'));
                    });
                    self.directionsForward();
                } else {
                    self.error('Directions request failed due to ' + status);
                }
            });
        },

        directionsForward: function(){
            console.log('directionsForward');
            console.log($('#map-directions-container'));
            console.log($('#map-directions-container table'));
            // TODO: Implementation
            $('#map-directions-container').find('.adp-directions tr').first().addClass('active');
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
        },

        //
        //
        // Segment transitions ------------------------------------------------------------------

        toSegment: function(index){
            this.directionsRenderer.setMap(null);
            this.directionsRenderer.setPanel(null);

            this.handleSegmentNav(index);

            for(var i = 0; i < index; i++){
                this.hideSegment(i);
            }

            var len = this.route.length;
            for(i = index + 1; i < len; i++){
                this.showSegment(i);
            }

            if(typeof this.route === 'object' && typeof this.route[index] === 'object'){
                if(this.route[index].mode === 'WALK'){
                    this.route[index].poly.setMap(null);
                    this.renderDirections(this.route[index].from, this.route[index].to);
                } else {
                    this.activateSegment(index);
                }

            } else if(index == this.route.length){
                // TODO: Implementation
                console.log('You are at destination');

            } else if(index == -1){
                var bounds = new google.maps.LatLngBounds();
                this.route.forEach(function(v){
                    v.poly.getPath().getArray().forEach(function(v){
                        bounds.extend(v);
                    });
                });
                this.map.fitBounds(bounds);

            } else {
                this.error('Invalid route data');
            }
        },

        activateSegment: function(index){
            if(this._hasProp(this.route[index], 'poly')){
                var bounds = new google.maps.LatLngBounds();
                this.route[index].poly.getPath().getArray().forEach(function(v){
                    bounds.extend(v);
                });
                this.route[index].poly.setOptions(JSON.parse(JSON.stringify(this.styles.ACTIVE)));
                this.map.fitBounds(bounds);
            }
        },

        showSegment: function(index){
            if(this._hasProp(this.route[index], 'poly') && typeof this.route[index].poly.setMap === 'function'){
                this.route[index].poly.setOptions(JSON.parse(JSON.stringify(
                    typeof this.styles[this.route[index].mode] !== 'undefined'
                        ? this.styles[this.route[index].mode]
                        : this.styles.DEFAULT
                )));

                this.route[index].poly.setMap(this.map);
            }
        },

        hideSegment: function(index){
            if(this._hasProp(this.route[index], 'poly') && typeof this.route[index].poly.setMap === 'function'){
                this.route[index].poly.setMap(null);
            }
        },

        handleSegmentNav: function(index){
            if(index < 0){
                this.buttonBack.style.display = 'none';
            } else {
                this.buttonBack.style.display = 'inline-block';
            }
            if(index >= this.route.length){
                this.buttonNext.style.display = 'none';
            } else {
                this.buttonNext.style.display = 'inline-block';
            }
        },

        //
        //
        // Location ----------------------------------------------------------------------------

        initLocation: function(callback){
            if (navigator.geolocation){
                var self = this,
                    shouldCallback = (typeof callback === 'function');

                self.marker.setMap(self.map);

                self.geolocationInterval = navigator.geolocation.watchPosition(
                    function(position){
                        self.geolocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                        self.marker.setPosition(self.geolocation);

                        if(shouldCallback){
                            callback(self.geolocation, self);
                            shouldCallback = false;
                        }
                    },
                    function(){
                        self.error('Cannot fetch location');
                    },
                    self.defaults.location.options
                );
            } else {
                this.error('Geolocation is not supported');
            }
        },

        deInitLocation: function(){
            this.marker.setMap(null);
            this.geolocationInterval = null;
        },

        // Arguments for compatibility with callbacks

        fitLocationBounds: function(position, handler){
            if(!handler && typeof this.map === 'object'){
                handler = this;
            }

            if(!position && typeof handler.geolocation === 'object'){
                position = handler.geolocation;
            }

            if(position && handler){
                var bounds = handler.map.getBounds();
                bounds.extend(position);
                handler.map.fitBounds(bounds);
            }
        }
    });