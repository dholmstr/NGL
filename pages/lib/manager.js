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
                currentRoute: {}
            },

            'currentStep': 1
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
                'container': null
            }
        },

        currentStep: null,
        err: null,
        route: null,

        digitransitManager: null,
        mapManager: null,

        init: function(){
            this._initDefaults();

            if(!this._initButtons() || !this._initSteps()){
                this.error(this.err);
                return false;
            }

            this.digitransitManager = new DigitransitManager();

            // TODO: Move this to defaults
            this.mapManager = new MapManager({
                'mapContainerId' : 'map-container',
                'directionsContainerId': 'map-directions-container',
                'apiKey' : 'AIzaSyAq4CZxYBwQ3Mf3RDJGH6CYUbBU1nonVpI'
            });

            this.toStep(this.currentStep);
        },

        _initDefaults: function(){
            // TODO: Refactor me if there are more params

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
            // TODO: Proper way to show messages
            console.log('ERROR: ' + msg);
        },

        _persist: function(key, value){
            // TODO: Implementation. Store data in browser local storage
            console.log('Persist called for key: ' + key + " value: " + value);
        },

        _getPersisted: function(key){
            // TODO: Implementation
            console.log('_getPersisted called for key: ' + key);
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

            var route = this._getPersisted('route');
            if(typeof routes === 'object' && typeof routes.allRoutes === 'object'){
                return this.showPlans(routes.allRoutes, this.error, this);
            }

            // Load Digitransit itineraries
            this.digitransitManager.getPlans(
                this.route.from,
                this.route.to,
                this.showPlans, // callback on success
                this.error,     // callback on failure
                this            // referense to the current object
            );
        },

        setItinerary: function(index){
            if(!isNaN(index) && typeof this.route.allRoutes[index] === 'object'
            && typeof this.route.allRoutes[index].legs === 'object' && this.route.allRoutes[index].legs.length > 0){

                this.route.currentRoute = this.route.allRoutes[index].legs;

                // TODO: Usability: shall we keep old routes here?
                this.route.allRoutes = {};

                console.log(this.route.from);
                console.log(this.route.to);
                console.log(this._getWayPoints());

                this.mapManager.renderRoute(this.route.from, this.route.to, this._getWayPoints());
                this.toStep(++this.currentStep);

                return true;
            }

            this.error('Invalid itinerary data');
            return false;
        },

        _getWayPoints: function(){
            // TODO: Implementation, use lat / lon
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
            //return [];
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
            var self = handler,
                err = false;

            try{
                data = self._unwrapPlansData(data);
                console.log(data);

                if(data.length > 0){
                    self._appendPlansHtml(data);
                    self.route.allRoutes = data;
                    self._persist('route', self.route);
                    self._bindPlanListEvents();
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
            var el = $(this.steps[this.currentStep].container).find('input[name=from]').first();
            if(typeof el !== 'object' || el.length === 0 || $(el).val().length === 0){
                this.error('Please specify starting point');
                return false;
            }

            var from = $(el).val();
            // TODO: Convert from to lat/lon here
            console.log('from: ' + from);

            this.route.from = {
                lat:60.199196699999995,
                lon:24.9397302
            };
            this._persist('route', this.route);
            return true;
        },

        validateTo: function(){
            var el = $(this.steps[this.currentStep].container).find('input[name=to]').first();
            if(typeof el !== 'object' || el.length === 0 || $(el).val().length === 0){
                this.error('Please specify destination');
                return false;
            }

            var to = $(el).val();
            // TODO: Convert to to lat/lon here
            console.log('to: ' + to);

            this.route.to = {
                lat:60.168438,
                lon:24.929283
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