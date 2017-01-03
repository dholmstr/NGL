Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.Manager', {

        defaults: {
            'buttons': {
                'back': {
                    'id': 'button-back'
                },
                'next': {
                    'id': 'button-next'
                },
                'go': {
                    'id': 'button-go'
                },
                'reset': {
                    'id': 'button-reset'
                }
            },

            'steps':{
                1: {
                    'id' : 'step-from',
                    'buttons': ['next']
                },
                2: {
                    'id' : 'step-to',
                    'buttons': ['back', 'next']
                },
                3: {
                    'id' : 'step-routes',
                    'buttons': ['back']
                },
                4: {
                    'id' : 'step-map',
                    'buttons': ['reset', 'go']
                }
            },

            route: {
                from : {},
                to: {},
                allRoutes: {},
                currentRoute: {},
                wayPoints: []
            },

            mapConfig: {
                'mapContainerId': 'map-container',
                'directionsContainerId': 'map-directions-container',
                'apiKey': 'AIzaSyAq4CZxYBwQ3Mf3RDJGH6CYUbBU1nonVpI'
            },

            'currentStep': 1,
            'distanceMinShowDirections': 50 // meters
        },

        buttons: {
            'back': {
                'el': null,
                'disabled': false
            },
            'next': {
                'el': null,
                'disabled': false
            },
            'go': {
                'el': null,
                'disabled': false
            },
            'reset': {
                'el': null,
                'disabled': false
            }
        },

        steps: {
            1: {
                'container': null,
                'validators': {
                    'default': 'validateFrom'
                }
            },
            2: {
                'container': null,
                'validators': {
                    'default': 'validateTo'
                }
            },
            3: {
                'container': null,
                'init': 'initItineraries'
            },
            4: {
                'container': null,
                'init': 'initMapRoute'
            }
        },

        currentStep: null,
        err: null,
        route: null,
        fromInput: null,
        toInput: null,
        digitransitManager: null,
        mapManager: null,

        init: function(){
            this._initDefaults();

            if(!this._initButtons() || !this._initSteps()){
                this.error(this.err);
                return false;
            }

            this.digitransitManager = new DigitransitManager();

            var self = this;

            // Wait until mapManager is fully initialized (callback)
            this.mapManager = new MapManager(self.defaults.mapConfig, (function(){
                self.fromInput = new google.maps.places.Autocomplete(document.getElementById('input-from'));
                self.toInput = new google.maps.places.Autocomplete(document.getElementById('input-to'));
                self.toStep(self.currentStep);
            }));
        },

        _initDefaults: function(){
            this.currentStep = this._getPersisted('currentStep');
            if(!this.currentStep){
                this.currentStep = this.defaults.currentStep;
            }

            this.route = this._getPersisted('route');
            if(!this.route){
                this.route = this.defaults.route;
            }
        },

        _initButtons: function(){
            var self = this;

            // Initialize all buttons in the beginning
            // More efficient than searching for them each time they are needed
            $.each(self.buttons, function(i, button){
                button.el = $('#'+self.defaults.buttons[i]['id']);
                if(button.el.length == 0){
                    self.err = 'Cannot init button ' + i;
                    return true;
                }
            });

            // Bind button events
            // TODO: Check if button is not disabled
            // TODO: Add this.err = null; (Clear errors before processing button click)

            if(!self.err){
                $(self.buttons.back.el).on('click', function(){
                    self.toStep(--self.currentStep);
                });
                $(self.buttons.next.el).on('click', function(){
                    if(self.validate('next')){
                        self.toStep(++self.currentStep);
                    }
                });
                $(self.buttons.go.el).on('click', function(){
                    if(self.validate('go')){
                        // TODO: Bind event for 'go' button
                    }
                });
                $(self.buttons.reset.el).on('click', function(){
                    self.reset();
                });
            }
            return !self.err;
        },

        _initSteps: function(){
            var self = this;

            // Initialize all step containers in the beginning
            // More efficient than searching for them each time they are needed
            $.each(self.steps, function(i, step){
                step.container = $('#'+self.defaults.steps[i]['id']);
                if(step.container.length == 0){
                    self.err = 'Cannot init step ' + i;
                    return true;
                }
            });
            return !self.err;
        },

        reset: function(){
            // TODO: Reset other parameters here if necessary
            //this.route = {};
            //this.currentStep = 1;
            // TODO: Reset all persisted data
            //this._initDefaults();
            this.toStep(this.defaults.currentStep);
        },

        // Might be called from callback, i.e. should use only static methods here
        error: function(msg){
            // TODO: Show nicely to the user, possibly implement localization
			window.alert('ERROR: ' + msg);
            console.log('ERROR: ' + msg);
        },

        _persist: function(key, value){
            if(typeof Storage !== 'undefined'){
                localStorage.setItem(key, JSON.stringify(value));
            }
        },

        _getPersisted: function(key){
            if(typeof Storage !== 'undefined'){
                return JSON.parse(localStorage.getItem(key));
            }
        },

        toStep: function(step){
            if(isNaN(step) || typeof this.steps[step] === 'undefined'){
                step = this.defaults.currentStep;
            }

            this.err = null;

            // Save step data in the browser local storage
            this._persist('currentStep', this.currentStep = step);

            // Call to a step-specific method if such a method specified in the step config
            if(this._canCall(this.steps[this.currentStep].init)){
                this[this.steps[this.currentStep].init]();
            }

            // Init step html
            $.each(this.steps, function(i, s){
                if(i == step){
                    $(s.container).show();
                } else {
                    $(s.container).hide();
                }
            });
            this._initStepButtons(step);
        },

        // Show and enable or hide and disable buttons according to config of the current step
        _initStepButtons: function(step){
            var self = this;
            var stepButtonSet = self.defaults.steps[step].buttons;
            $.each(self.buttons, function(i, button){
                if(stepButtonSet.indexOf(i) > -1){
                    button.disabled = false;
                    $(button.el).show();
                } else {
                    button.disabled = true;
                    $(button.el).hide();
                }
            });
        },

        initItineraries: function(){
            // Clear container html
            $(this.steps[this.currentStep].container).html('');

            // Try to use routes stored locally
            if(typeof this.route === 'object' && this.route.allRoutes.length > 0){
                return this.showPlans(this.route.allRoutes, this.error, this);
            }

            // Load Digitransit itineraries
            this.digitransitManager.getPlans(
                this.route.from,
                this.route.to,
                this._prepareItineraries,   // callback on success
                this.error,                 // callback on failure
                this                        // reference to the current object
            );
        },

        // Format and save in local storage itineraries received from digitransit
        _prepareItineraries: function(data, callbackOnFail, handler){
            handler.route.allRoutes = handler._unwrapPlansData(data);
            handler._persist('route', handler.route);
            return handler.showPlans(handler.route.allRoutes, handler.error, handler);
        },

        setItinerary: function(index){
            if(!isNaN(index) && typeof this.route.allRoutes[index] === 'object'
            && typeof this.route.allRoutes[index].legs === 'object' && this.route.allRoutes[index].legs.length > 0){

                this.route.currentRoute = this.route.allRoutes[index].legs;
                this._persist('route', this.route);
                this.toStep(++this.currentStep);
                return true;
            }

            this.error('Invalid itinerary data');
            return false;
        },


        initMapRoute: function(){
            if(typeof this.route !== 'object' || !this.route.from || !this.route.to){
                this.error('Cannot render itinerary');
                return;
            }

            this.mapManager.clearRoutes();
            this.mapManager.renderRoute(this.route.from, this.route.to, this._getWayPoints());
        },

        _pushPoint: function(point){
            var len = this.route.wayPoints.length;
            if(len === 0 || this.mapManager.getDistance(this.route.wayPoints[len - 1].location, point) > this.defaults.distanceMinShowDirections){
                this.route.wayPoints.push({
                    location: point,
                    stopover: true  // Mandatory to include in the route
                });
            }
        },

        _getWayPoints: function(){
            // TODO: Use separate Google Maps route for each walk, for transit show digitransit polyline
            var lastPoint = null,
                self = this;

            this.route.wayPoints = [];

            $(this.route.currentRoute).each(function(){
                var from = new google.maps.LatLng(this.from.lat, this.from.lon);
                var to = new google.maps.LatLng(this.to.lat, this.to.lon);

                if(lastPoint !== null && self.mapManager.getDistance(lastPoint, from) > self.defaults.distanceMinShowDirections){
                    self._pushPoint(lastPoint);
                    self._pushPoint(from);
                }

                if(this.mode === 'WALK'){
                    self._pushPoint(from);
                    self._pushPoint(to);
                }

                lastPoint = to;
            });

            return this.route.wayPoints;
        },

        _unwrapPlansData: function(data){
            $.each(['data', 'plan', 'itineraries'], function(k, v){
                if(!data[v] || typeof data[v] !== 'object'){
                    data = [];
                    return true;
                }
                data = data[v];
            });
            return data;
        },

        _appendPlansHtml: function(data){
            var container = $('#step-routes').first();

            if(typeof container === 'object' && container.length > 0){
                var list = $("<ul class='itineraries-list'></ul>");

                $.each(data, function(i, v){
                    var item = $("<li class='itineraries-item'></li>").data('itinerary', i);
                    if(v.duration){
                        $("<span class='duration'>" + Manager.secondsToHuman(v.duration) + "</span>").appendTo(item);
                    }
                    if(v.walkDistance){
                        $("<span class='distance'>" + Manager.metersToHuman(v.walkDistance) + "</span>").appendTo(item);
                    }
                    if(v.legs && typeof v.legs === 'object'){
                        var itemParts = $("<ul class='item-parts'></ul>");
                        $.each(v.legs, function(i, v){
                            var itemPart = $("<li class='item-parts-part'></li>");
                            if(v.mode){
                                $("<span class='mode'>" + v.mode + "</span>").appendTo(itemPart);
                            }
                            if(v.distance){
                                $("<span class='distance'>" + Manager.metersToHuman(v.distance) + "</span>").appendTo(itemPart);
                            }
                            if(v.duration){
                                $("<span class='duration'>" + Manager.secondsToHuman(v.duration) + "</span>").appendTo(itemPart);
                            }
                            if(v.startTime){
                                $("<span class='start-time'>" + Manager.unixTimeToHuman(v.startTime) + "</span>").appendTo(itemPart);
                            }
                            if(v.endTime){
                                $("<span class='arrival-time'>" + Manager.unixTimeToHuman(v.endTime) + "</span>").appendTo(itemPart);
                            }
                            if(v.from && v.from.name){
                                $("<span class='from'>" + v.from.name + "</span>").appendTo(itemPart);
                            }
                            if(v.to && v.to.name){
                                $("<span class='to'>" + v.to.name + "</span>").appendTo(itemPart);
                            }
                            $(itemParts).append(itemPart);
                        });
                        $(item).append(itemParts);
                    }
                    $(list).append(item);
                });
                $(container).append(list);
            }
        },

        _bindPlanListEvents: function(){
            var self = this;
            $('.itineraries-list > .itineraries-item').each(function(){
                $(this).on('click', function(){
                    self.setItinerary($(this).data('itinerary'));
                });
            });
        },


        // We must pass reference to self (handler) as a parameter, because this method might be
        // a callback from the digitransit manager
        showPlans: function(data, callbackOnFail, handler){
            var err = false;
            try{
                if(data.length > 0){
                    handler._appendPlansHtml(data);
                    handler._bindPlanListEvents();
                    return true;
                }
            } catch(e){
                err = e;
            }

            if(callbackOnFail && typeof callbackOnFail === 'function'){
                callbackOnFail(err ? err : 'No plans available for the route');
            }
        },

        validate: function(action){
            var validatorName = this._getValidatorName(action);
            if(validatorName){
                return this[this.steps[this.currentStep].validators[validatorName]]();
            }
            return true;
        },

        _canCall: function(functionName){
            return typeof functionName !== 'undefined'
                && functionName.length > 0
                && typeof this[functionName] === 'function';
        },

        _getValidatorName: function(action){
            var validators = this.steps[this.currentStep].validators;
            if(typeof this.steps[this.currentStep].validators === 'object'){
                var actions = [action, 'default'];
                for(var i = 0; i < actions.length; i++){
                    if(this._canCall(this.steps[this.currentStep].validators[actions[i]])){
                        return actions[i];
                    }
                }
            }
            return null;
        },

        validateFrom: function(){
            var place = this.fromInput.getPlace();
            if(!place.geometry) {
                this.error('Cannot find starting point');
                return false;
            }

            this.route.from = {
                lat: place.geometry.location.lat(),
                lon: place.geometry.location.lng()
            };

            this._persist('route', this.route);
            return true;
        },

        validateTo: function(){
            var place = this.toInput.getPlace();
            if(!place.geometry) {
                this.error('Cannot find destination');
                return false;
            }

            this.route.to = {
                lat: place.geometry.location.lat(),
                lon: place.geometry.location.lng()
            };

            this._persist('route', this.route);
            return true;
        }
    });


// "Static" methods of the Manager class

Manager.unixTimeToHuman = function(value){
    var date = new Date(value);
    var h = ("0" + date.getHours()).substr(-2),
        m = ("0" + (date.getMinutes() + (date.getSeconds() > 30 ? 1 : 0))).substr(-2);
    return h + ':' + m;
};

Manager.secondsToHuman = function(value, extraMin){
    value = Math.round(value);
    var h = parseInt(value / 3600),
        m = Math.round((value - h * 3600) / 60) + (extraMin ? parseInt(extraMin) : 0);
    return ((h > 0) ? h + 'h ' : '') + m + 'min';
};

Manager.metersToHuman = function(value){
    value = Math.round(value);
    var km = parseInt(value / 1000),
        m = Math.round(value - km * 1000);
    return ((km > 0) ? km + 'km ' : '') + m + 'm';
};