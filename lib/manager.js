/*
 *  Copyright 2017, Natalia Gavrilenko and Daniel Holmström
 *  Licenced under MIT licence
 */

Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.Manager', {

        defaults: {
            buttons: {
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

            steps:{
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
                    'buttons': ['reset', 'go', 'go-back', 'back']
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
                'buttonNextId': 'button-go',
                'buttonBackId': 'button-go-back',
                'directionsContainerId': 'map-directions-container',
                'apiKey': 'AIzaSyAq4CZxYBwQ3Mf3RDJGH6CYUbBU1nonVpI'
            },

            placeOptions: {
                componentRestrictions : {
                    country: 'fi'
                }
            },

            currentStep: 1
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

        // Validators are executed in a current step after a button has been pressed
        // and before transition to a new step. It is possible to specify a validator
        // for a particular button or to use default validator for any button. The "reset"
        // action will always be executed without validation.

        // Init scripts are called immediately after transition to a step

        steps: {
            1: {
                'container': null,
                'validators': {
                    'next': 'validateFrom'
                }
            },
            2: {
                'container': null,
                'validators': {
                    'next': 'validateTo'
                }
            },
            3: {
                'container': null,
                'init': 'initItineraries'
            },
            4: {
                'container': null,
                'validators': {
                    'back': 'validateSegment'
                },
                'init': 'initMapRoute'
            }
        },

        cacheKeys: ['currentStep', 'route'],

        currentStep: null,
        route: null,

        fromInput: null,
        toInput: null,

        digitransitManager: null,
        mapManager: null,
        translator: null,

        err: null,

        // Constructor

        init: function(){
            this._initDefaults();

            if(!this._initButtons() || !this._initSteps()){
                this.error(this.err);
                return false;
            }

            this.digitransitManager = new DigitransitManager();
            this.translator = new Translator({lang: 'fi'});

            var self = this;

            // Wait until mapManager is fully initialized (callback)
            this.mapManager = new MapManager(self.defaults.mapConfig, (function(){
                self.fromInput = new google.maps.places.Autocomplete(document.getElementById('input-from'), self.defaults.placeOptions);
                self.toInput = new google.maps.places.Autocomplete(document.getElementById('input-to'), self.defaults.placeOptions);
                self.toStep(self.currentStep);
            }));
        },

        _initDefaults: function(){
            var self = this;

            new AppCache().initKeys(this.cacheKeys);

            self.cacheKeys.forEach(function(key){
                self[key] = AppCache.getPersisted(key);
                if(!self[key]){
                    self[key] = JSON.parse(JSON.stringify(self.defaults[key]));
                }
            });
        },

        // Initialize all buttons in the beginning
        // More efficient than searching for them each time they are needed

        _initButtons: function(){
            var self = this;

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
                    self.validate('back', function(){
                        self.toStep(--self.currentStep)
                    });
                });
                $(self.buttons.next.el).on('click', function(){
                    self.validate('next', function(){
                        self.toStep(++self.currentStep);
                    });
                });
                $(self.buttons.go.el).on('click', function(){
                    self.validate('go', function(){
                        self.mapManager.toSegment(++self.route.currentSegment);
                    });
                });
                $(self.buttons['go-back'].el).on('click', function(){
                    self.validate('go-back', function(){
                        self.mapManager.toSegment(--self.route.currentSegment);
                    });
                });
                $(self.buttons.reset.el).on('click', function(){
                    self.reset();
                });
            }

            return !self.err;
        },

        // Initialize all step containers in the beginning
        // More efficient than searching for them each time they are needed

        _initSteps: function(){
            var self = this;
            $.each(self.steps, function(i, step){
                step.container = $('#'+self.defaults.steps[i]['id']);
                if(step.container.length == 0){
                    self.err = 'Cannot init step ' + i;
                    return true;
                }
            });
            return !self.err;
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

        reset: function(){
            AppCache.clearAll();
            this._initDefaults();
            this.mapManager.clear();
            this.toStep(this.defaults.currentStep);
        },

        toStep: function(step){
            if(isNaN(step) || typeof this.steps[step] === 'undefined'){
                step = this.defaults.currentStep;
            }

            this.err = null;

            // Save step data in the browser local storage
            AppCache.persist('currentStep', this.currentStep = step);

            // Init step html
            $.each(this.steps, function(i, s){
                if(i == step){
                    $(s.container).show();
                } else {
                    $(s.container).hide();
                }
            });

            this._initStepButtons(step);

            // Call to a step-specific method if such a method specified in the step config
            if(this._canCall(this.steps[this.currentStep].init)){
                this[this.steps[this.currentStep].init]();
            }
        },

        validate: function(action, successCallback){
            var validatorName = this._getValidatorName(action);
            if(validatorName){
                this[this.steps[this.currentStep].validators[validatorName]](successCallback);
            } else if(typeof successCallback === 'function'){
                successCallback();
            }
        },

        error: function(msg, graceful){
            if(!graceful){
                AppCache.clearAll();
            }
            // TODO: Nicer way to show errors
            alert(msg);
        },

        //
        //
        // Map routes -----------------------------------------------------------------------

        initMapRoute: function(){
            // Have to re-init map, because it might not be initialized correctly in the hidden section
            this.mapManager.initMap();

            if(typeof this.route !== 'object' || !this.route.from || !this.route.to){
                this.error(this.translator.translate('Cannot render itinerary'));
                return;
            }

            this.mapManager.renderRoute(this.route.currentRoute);
        },

        //
        //
        // Itineraries -----------------------------------------------------------------------

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

        setItinerary: function(index){
            if(!isNaN(index) && typeof this.route.allRoutes[index] === 'object'
                && typeof this.route.allRoutes[index].legs === 'object' && this.route.allRoutes[index].legs.length > 0){
                this.route.currentRoute = JSON.parse(JSON.stringify(this.route.allRoutes[index].legs));
                AppCache.persist('route', this.route);
                this.toStep(++this.currentStep);
                return true;
            }
            this.error(this.translator.translate('Invalid itinerary data'));
            return false;
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

        // Format and save in local storage itineraries received from digitransit
        _prepareItineraries: function(data, callbackOnFail, handler){
            handler.route.allRoutes = handler._unwrapPlansData(data);
            AppCache.persist('route', handler.route);
            return handler.showPlans(handler.route.allRoutes, handler.error, handler);
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

        //
        //
        // Validators -----------------------------------------------------------------------

        validateFrom: function(successCallback){
            var value = $('#input-from').val();

            if(!value){
                return this.error(this.translator.translate('Please specify address'), true);
            }

            var place = this.fromInput.getPlace();
            if(place && place.geometry){
                return this._setPlace('from', place, successCallback);
            }

            // In some browsers Google places autocomplete does not pick place if input value
            // was pre-filled by browser. Try to get place from Google place service in this case.

            this.mapManager.getPlace(value, this, function(place, handler){
                handler._setPlace('from', place, successCallback);
            });
        },

        validateTo: function(successCallback){
            var value = $('#input-to').val();

            if(!value){
                return this.error(this.translator.translate('Please specify address'), true);
            }

            var place = this.toInput.getPlace();
            if(place && place.geometry){
                return this._setPlace('to', place, successCallback);
            }

            // Same as for the "from" input

            this.mapManager.getPlace(value, this, function(place, handler){
                handler._setPlace('to', place, successCallback);
            });
        },

        validateSegment: function(successCallback){
            this.route.currentSegment = this.defaults.route.currentSegment;
            if(typeof successCallback === 'function'){
                successCallback();
            }
        },

        _setPlace: function(key, place, successCallback){
            if(place && place.geometry && typeof this.route[key] === 'object'){
                this.route[key] = {
                    lat: place.geometry.location.lat(),
                    lon: place.geometry.location.lng()
                };

                AppCache.persist('route', this.route);

                if(typeof successCallback === 'function'){
                    successCallback();
                }

                return;
            }

            this.error(this.translator.translate('Please specify place'));
        },

        //
        //
        // Html handlers ---------------------------------------------------------------

        _formatRouteTitle: function(data){
            if(typeof data === 'object' && data.startTime && data.endTime && data.duration){
                return Manager.unixTimeToHuman(data.startTime) + ' - ' + Manager.unixTimeToHuman(data.endTime) + ' (' + Manager.secondsToHuman(data.duration) + ') ';
            }
            return this.translator.translate('Route ');
        },

        _getModeName: function(data){
            if(typeof data === 'object' && data.mode && data.mode == 'RAIL' && typeof data.route === 'object' && data.route.shortName){
                return this.translator.translate('%1-' + data.mode, [data.route.shortName]);
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

//
//
// "Static" methods of the Manager class -------------------------------------------------

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