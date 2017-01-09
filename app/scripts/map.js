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
                icon: window.location + 'skin/img/location.svg',
                options: {
                    enableHighAccuracy: true,
                    maximumAge        : 30000,  // milliseconds
                    timeout           : 27000   // milliseconds
                }
            },

            navigation: {
                timeout: 10000,        // milliseconds
                switchStep: 50         // meters
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

        navigationInterval: null,

        marker: null,

        directionsPanel: null,
        segmentPanel: null,

        directionsService: null,
        placeService: null,
        directionsRenderer: null,
        translator: null,

        currentSegment: -1,
        currentStep: 0,

        init: function(config, callback){
            var self = this, err = false;

            ['mapContainerId', 'buttonNextId', 'buttonBackId', 'directionsContainerId', 'apiKey', 'language'].forEach(function(param){
                if(!self._hasProp(config, param)){
                    return err = true;
                }
            });

            if(!err){
                ['mapContainerId', 'buttonNextId', 'buttonBackId', 'directionsContainerId', 'segmentContainerId'].forEach(function(param){
                    if(!self._isValidNodeId(config[param])){
                        return err = true;
                    }
                });

                if(!err){
                    self._loadScript("https://maps.googleapis.com/maps/api/js?language=" + config.language + "&libraries=geometry,places&key=" + config.apiKey, function(){
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
            this.segmentPanel = document.getElementById(config.segmentContainerId);
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

        setCurrentSegment: function(index){
            this.currentSegment = parseInt(index);
        },

        getCurrentSegment: function(index){
            return this.currentSegment;
        },

        setTranslator: function(translator){
            this.translator = translator;
        },

        renderRoute: function(route){
            var self = this,
                config = {},
                bounds = this.map.getBounds();

            if(!bounds){
                bounds = new google.maps.LatLngBounds();
            }

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
            if(!this.geolocation){
                this.initLocation();
            }
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
                if(status === google.maps.DirectionsStatus.OK){
                    self.directionsRenderer.setMap(self.map);
                    self.directionsRenderer.setDirections(response);

                    try{
                        self.route[self.currentSegment].steps = response.routes[0].legs[0].steps;
                    } catch(e){
                        self.error('Failed to load navigation instructions');
                    }

                    self.toStep(0, self);
                    self.startNavigation(self);

                } else {
                    self.error('Directions request failed due to ' + status);
                }
            });
        },

        toStep: function(index, handler, distance){
            if(!handler && typeof this.toStep === 'function'){
                handler = this;
            }

            handler.currentStep = index;

            try{
                $(handler.directionsPanel).text(
                    (distance && typeof handler.translator === 'object' ? handler.translator.translate('In %1 meters ', [distance]) : '') +
                    handler.route[handler.currentSegment].steps[index].instructions.replace(/(<([^>]+)>)/ig, '')
                );
            } catch(e){
                $(handler.directionsPanel).text('');
                clearInterval(handler.navigationInterval);
            }
        },

        startNavigation: function(handler){
            if(!handler && typeof this.startNavigation === 'function'){
                handler = this;
            }

            handler.navigationInterval = setInterval(function(){
                var distance = google.maps.geometry.spherical.computeDistanceBetween(
                    handler.route[handler.currentSegment].steps[handler.currentStep].end_point,
                    handler.geolocation
                );

                if(distance < handler.defaults.navigation.switchStep){
                    handler.toStep(handler.currentStep + 1, null, parseInt(distance));
                }

            }, handler.defaults.navigation.timeout);
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
            this.currentSegment = index;
            clearInterval(this.navigationInterval);

            this.directionsRenderer.setMap(null);
            this.directionsRenderer.setPanel(null);

            this.handleSegmentNav(index);
            this._updatePanel();

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

        _updatePanel: function(){
            $(this.directionsPanel).text('');
            $(this.segmentPanel).text('');

            try{
                if(this.currentSegment >= 0 && this.currentSegment < this.route.length){
                    if(this.route[this.currentSegment].mode == 'WALK'){
                        $(this.segmentPanel).text(
                            this.translator.translate(
                                '%1 %2 to %3', [
                                    this.route[this.currentSegment].mode,
                                    Manager.metersToHuman(this.route[this.currentSegment].distance),
                                    this.route[this.currentSegment].to.name
                                ]
                            )
                        );

                    } else if(this.route[this.currentSegment].mode == 'BUS' || this.route[this.currentSegment].mode == 'TRAM'){
                        $(this.segmentPanel).text(
                            this.translator.translate(
                                '%1 %2 to %3', [
                                    this.route[this.currentSegment].mode,
                                    this.route[this.currentSegment].route.shortName,
                                    this.route[this.currentSegment].to.name
                                ]
                            )
                        );
                    } else if(this.route[this.currentSegment].mode == 'RAIL' || this.route[this.currentSegment].mode == 'SUBWAY'){
                        $(this.segmentPanel).text(
                            this.translator.translate(
                                '%1 %2: to %3', [
                                    this.route[this.currentSegment].mode,
                                    this.route[this.currentSegment].route.longName,
                                    this.route[this.currentSegment].to.name
                                ]
                            )
                        );
                    }
                } else if(this.currentSegment == this.route.length){
                    $(this.segmentPanel).text(this.translator.translate('Destination'));
                }

            } catch(e){
                $(this.segmentPanel).text('');
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

        initLocation: function(callback, callbackError, handler, params){
            if (navigator.geolocation){
                var self = this,
                    shouldCallback = true;

                self.geolocationInterval = navigator.geolocation.watchPosition(
                    function(position){
                        self.geolocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                        self.marker.setMap(self.map);
                        self.marker.setPosition(self.geolocation);

                        if(shouldCallback){
                            self.fitLocationBounds();
                            if(typeof callback === 'function'){
                                callback(self.geolocation, handler, params);
                            }
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

        getLocation: function(callback, callbackError, handler, params){
            if(this.geolocation){
                callback(this.geolocation, handler, params);
                return;
            }

            this.initLocation(callback, callbackError, handler, params);
        },

        deInitLocation: function(){
            this.marker.setMap(null);
            navigator.geolocation.clearWatch(this.geolocationInterval);
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