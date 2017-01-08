/*
 *  Copyright 2017, Natalia Gavrilenko and Daniel Holmström
 *  Licenced under MIT licence
 */

Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.Translator', {

        defaults: {
            lang: 'fi'
        },

        lang: null,

        init: function(config){
            this.lang = (typeof config === 'object' && config.lang) ? config.lang : this.defaults.lang;
        },

        setLanguage: function(lang){
            if(lang){
                this.lang = lang;
            }
        },

        translate: function(phrase, vars){
            if(typeof Translator.phrases[this.lang] === 'object' && Translator.phrases[this.lang][phrase]){
                phrase = Translator.phrases[this.lang][phrase];
            }

            if(vars && vars.constructor == Array){
                vars.forEach(function(v, i){
                    phrase = phrase.replace('%' + (i + 1), v.toString());
                });
            }
            return phrase;
        }
    });

// TODO: All phrases
Translator.phrases = {
    fi: {
        'Test phrase 1': 'Esimerkki lause 1',
        'This is a phrase with a variable %1': 'Toinen esimerkki %1',
        '%1-RAIL': '%1-JUNA'
    }
};