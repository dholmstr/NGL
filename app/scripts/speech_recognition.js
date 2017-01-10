/*
 *  Copyright 2017, Natalia Gavrilenko and Daniel Holmström
 *  Licenced under MIT licence
 */

Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.SpeechRecognitionManager', {

        defaults: {
            continuous: false,
            interimResults: false,
            lang: 'fi-FI'
        },

        recognition: null,
        control: null,
        target: null,

        init: function(){
            if(window.hasOwnProperty('SpeechRecognition')){
                this.recognition = new SpeechRecognition();
            } else if (window.hasOwnProperty('webkitSpeechRecognition')){
                this.recognition = new webkitSpeechRecognition();
            }

            if(this.recognition){
                this._configureRecognition();
                return this._initControls();
            }

            return false;
        },

        _configureRecognition: function(){
            var self = this;
            Object.keys(self.defaults).forEach(function(k){
                self.recognition[k] = self.defaults[k];
            });
        },

        _initControls: function(){
            this.control = $('#button-speech-recognition').first();
            if(this.control.length == 0){
                return false;
            }

            var self = this;
            $(this.control).on('click', function(){
                if($(this).hasClass('active')){
                    self.stop();
                } else {
                    self.start();
                }
            });
        },

        setTarget: function(target){
            if(target){
                this.target = target;
            }
        },

        showControl: function(){
            if(this.recognition && this.target){
                $(this.control).show();
            }
        },

        hideControl: function(){
            $(this.control).hide();
        },

        start: function(target){
            target = target ? target : this.target;
            if(!target){
                return;
            }

            var self = this;

            $(self.control).addClass('active');
            self.recognition.start();

            self.recognition.onresult = function(e){
                self.stop();
                $(self.target).val(e.results[0][0].transcript);
            };

            self.recognition.onerror = function(){
                self.stop();
            }
        },

        stop: function(){
            this.recognition.stop();
            $(this.control).removeClass('active');
        }
    });