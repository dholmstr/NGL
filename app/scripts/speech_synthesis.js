/*
 *  Copyright 2017, Natalia Gavrilenko and Daniel Holmström
 *  Licenced under MIT licence
 */

Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.SpeechSynthesisManager', {

        config: {
            volume: 1,      // 0 to 1
            rate: 1,        // 0.1 to 10
            pitch: 2,       // 0 to 2
            lang: 'en-US',
            voiceName: 'Daniel',
            voiceURI: 'native'
        },

        available: false,
        on: false,

        voice: null,

        init: function(config){
            if(window.hasOwnProperty('SpeechSynthesisUtterance')){
                this.available = true;
                this._initConfig(config);
                this._initControls();
            }
        },

        _initConfig: function(config){
            if(typeof config === 'object'){
                var self = this,
                    keys = Object.keys(self.config);

                keys.forEach(function(key){
                    self.config[key] = config[key] ? config[key] : self.config[key];
                });
            }

            var voices = speechSynthesis.getVoices(),
                len = voices.length;

            for(var i = 0; i < len; i++){
                if(voices[i].name == this.config.voiceName){
                    this.voice = voices[i];
                    break;
                }
            }
        },

        _initControls: function(){
            this.control = $('#button-speech-synthesis').first();
            if(this.control.length == 0){
                return false;
            }

            var self = this;
            $(this.control).on('click', function(){
                if($(this).hasClass('active')){
                    $(this).removeClass('active');
                    self.on = false;
                    self.stop();
                } else {
                    $(this).addClass('active');
                    self.on = true;
                }
            });
        },

        showControl: function(){
            if(this.available){
                $(this.control).show();
            }
        },

        hideControl: function(){
            $(this.control).hide();
        },

        getUtterance: function(){
            if(this.available){
                var self = this,
                    keys = Object.keys(self.config),
                    utterance = new SpeechSynthesisUtterance();

                keys.forEach(function(key){
                    utterance[key] = self.config[key];
                });

                utterance.voice = self.voice;
                return utterance;
            }
            return null;
        },

        speak: function(text){
            if(this.available && this.on){
                var utterance = this.getUtterance();
                utterance.text = text;
                speechSynthesis.speak(utterance);
            }
        },

        stop: function(){
            if(this.available){
                speechSynthesis.cancel();
            }
        }
    });