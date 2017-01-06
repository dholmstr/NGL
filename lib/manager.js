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
                'go-back': {
                    'id': 'button-go-back'
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
                    'buttons': ['reset', 'go', 'go-back']
                }
            },

            route: {
                from : {},
                to: {},
                allRoutes: {},
                currentRoute: {},
                currentSegment: -1
            },

            mapConfig: {
                'mapContainerId': 'map-container',
                'directionsContainerId': 'map-directions-container',
                'apiKey': 'AIzaSyAq4CZxYBwQ3Mf3RDJGH6CYUbBU1nonVpI'
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
            'go-back': {
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
                        self.forward();
                    }
                });
                $(self.buttons['go-back'].el).on('click', function(){
                    if(self.validate('go-back')){
                        self.back();
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
            this.mapManager.clear();
            this.toStep(this.defaults.currentStep);
        },

        forward: function(){
            console.log('forward called');
            // TODO: Process go and go-back buttons

            //this.toSegment(++this.currentSegment);
        },

        back: function(){
            console.log('back called');
            // TODO: Process go and go-back buttons
            //this.toSegment(--this.currentSegment);
        },

        // Might be called from callback, i.e. should use only static methods here
        error: function(msg){
            // TODO: Show nicely to the user, possibly implement localization
            console.log('ERROR: ' + msg);
        },

        // TODO: Should we use sessionStorage instead ?

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

        _clearPersisted: function(key){
            localStorage.removeItem(key);
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

            console.log(this.route.currentRoute);
            this.mapManager.renderRoute(this.route.currentRoute);
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

        translate: function(text, data){
            // TODO: Implemetation
            return text;
        },

        _bindPlanListEvents: function(){
            var self = this;
            $('a.route-title').each(function(){
                $(this).on('click', function(e){
                    e.preventDefault();
                    self.setItinerary($(this).data('itinerary'));
                });
            });

            $('span.itinerary-toggle').each(function(){
                $(this).on('click', function(){
                    $(this).parents('li.itineraries-item').first().toggleClass('active');
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
        },


        //
        //
        // Html handlers ---------------------------------------------------------------

        _formatRouteTitle: function(data){
            if(typeof data === 'object' && data.startTime && data.endTime && data.duration){
                return Manager.unixTimeToHuman(data.startTime) + ' - ' + Manager.unixTimeToHuman(data.endTime) + ' (' + Manager.secondsToHuman(data.duration) + ') ';
            }
            return this.translate('Route ');
        },

        _getModeName: function(data){
            if(typeof data === 'object' && data.mode && data.mode == 'RAIL' && typeof data.route === 'object' && data.route.shortName){
                return this.translate(data.route.shortName) + '-' + data.mode;
            }
            return data.mode;
        },

        _formatModeData: function(data){
            var result = '';

            if(typeof data === 'object' && data.mode){
                result += "<span class='mode " + data.mode.toLowerCase() + "'>" + this._getModeName(data) + "</span>";
                if(data.mode == 'WALK'){
                    result += "<span class='info'>" + Manager.metersToHuman(data.distance) + "</span>";
                } else if((data.mode == 'BUS' || data.mode == 'TRAM') && typeof data.route === 'object' && data.route.shortName){
                    result += "<span class='info'>" + data.route.shortName + "</span>";
                } else if((data.mode == 'RAIL' || data.mode == 'SUBWAY') && typeof data.route === 'object' && data.route.longName){
                    result += "<span class='info'>" + data.route.longName + "</span>";
                }

                // TODO: Other modes

                if(data.duration){
                    result += "<span class='duration'>" + Manager.secondsToHuman(data.duration) + "</span>";
                }
            }

            return result;
        },

        _appendPlansHtml: function(data){
            var self = this,
                container = $('#step-routes').first();

            if(typeof container === 'object' && container.length > 0){
                var list = $("<ul class='itineraries-list'></ul>");

                $.each(data, function(i, v){
                    var item = $("<li class='itineraries-item'></li>");

                    var itemTitle = $("<span class='itinerary-title-wrap'></span>");
                    $("<a class='route-title' href='#'>" + self._formatRouteTitle(v) + "</a>").data('itinerary', i).appendTo(itemTitle);
                    $("<span class='itinerary-toggle'></span>").appendTo(itemTitle);
                    $(itemTitle).appendTo(item);

                    if(v.legs && typeof v.legs === 'object'){
                        var itemParts = $("<ul class='item-parts'></ul>");
                        $.each(v.legs, function(i, v){
                            var itemPart = $("<li class='item-parts-part clearfix'></li>");
                            $("<span class='left'>" + self._formatModeData(v) + "</span>").appendTo(itemPart);

                            var right = $("<span class='right'></span>");

                            if(v.startTime && typeof v.from === 'object' && v.from.name){
                                var from = $("<span class='from'></span>");
                                $("<span class='start-time'>" + Manager.unixTimeToHuman(v.startTime) + "</span>").appendTo(from);
                                $("<span class='from'>" + v.from.name + "</span>").appendTo(from);
                                $(from).appendTo(right);
                            }

                            if(v.endTime && typeof v.to === 'object' && v.to.name){
                                var to = $("<span class='to'></span>");
                                $("<span class='arrival-time'>" + Manager.unixTimeToHuman(v.endTime) + "</span>").appendTo(to);
                                $("<span class='to'>" + v.to.name + "</span>").appendTo(to);
                                $(to).appendTo(right);
                            }

                            $(right).appendTo(itemPart);
                            $(itemParts).append(itemPart);
                        });
                        $(item).append(itemParts);
                    }
                    $(list).append(item);
                });
                $(container).append(list);
            }
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