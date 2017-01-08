Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.DigitransitManager',
    {
        url: 'https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql',

        planRequest: {
            from: {
                lat:60.204944,
                lon:24.664509
            },
            to: {
                lat:60.169854,
                lon:24.938383
            },
            numItineraries:3,
            modes : '\"BUS,TRAM,RAIL,SUBWAY,FERRY,WALK\"'
        },

        itinerariesData: {
            'itineraries':[
                'walkDistance',
                'startTime',
                'endTime',
                'duration',
                [{
                    'legs': [
                        'mode',
                        'startTime',
                        'endTime',
                        [{
                            'from': [
                                'lat',
                                'lon',
                                'name',
                                [{
                                    'stop': [
                                        'code',
                                        'name'
                                    ]
                                }]
                            ]
                        }],
                        [{
                            'to': [
                                'lat',
                                'lon',
                                'name',
                                [{
                                    'stop': [
                                        'code',
                                        'name'
                                    ]
                                }]
                            ]
                        }],
                        'mode',
                        [{
                            'agency': [
                                'id',
                                'gtfsId'
                            ]
                        }],
                        [{
                            'route': [
                                'id',
                                'gtfsId',
                                'shortName',
                                'longName',
                                'desc'
                            ]
                        }],
                        'duration',
                        'realTime',
                        'distance',
                        'transitLeg',
                        [{
                            'legGeometry': [
                                'length',
                                'points'
                            ]
                        }]
                    ]
                }]
            ]
        },

        itinerariesDataFormatted: null,

        init: function(config){
            // Convert itinerariesData to the GraphQL format
            this.itinerariesDataFormatted = JSON.stringify(this.itinerariesData)
                .replace(/\[{|}]|["']/g, '')
                .replace(/\[/g, '{')
                .replace(/]/g, '}')
                .replace(/[:,]/g, ' ');
        },

        getPlans: function(from, to, callback, callbackOnFail, handler){
            if(typeof from === 'object' && typeof from.lat === 'number' && typeof from.lon === 'number'){
                this.planRequest.from = from;
            }
            if(typeof to === 'object' && typeof to.lat === 'number' && typeof to.lon === 'number'){
                this.planRequest.to = to;
            }

            var params  = this._convert(this.planRequest, '', this._getLastKey(this.planRequest));

            this._request({
                "query": "{" + 'plan(' + params + ') ' + this.itinerariesDataFormatted + "}"
            }, callback, callbackOnFail, handler);
        },

        _request: function(data, callback, callbackOnFail, handler){
            var self = this;
            $.ajax({
                'url': self.url,
                'type': 'POST',
                'contentType': "application/json",
                'data': JSON.stringify(data)
            }).done(function(result){
                if(typeof callback === 'function'){
                    callback(result, callbackOnFail, handler);
                }
            }).fail(function (jqXHR, textStatus){
                if(callbackOnFail && typeof callbackOnFail === 'function'){
                    callbackOnFail(textStatus);
                }
            });
        },

        _convert: function(data, res, lastIndex){
            var self = this;
            $.each(data, function(i, v){
                var value = '';
                if(typeof v === 'object'){
                    value += self._convert(v, value, self._getLastKey(v));
                    value = "{" + value + "}";
                } else {
                    value += v;
                }
                res += i + ':' + value + (i != lastIndex ? ', ' : '');
            });
            return res;
        },

        _getLastKey: function(obj){
            var keys = Object.keys(obj);
            var len = keys.length;
            return len > 0 ? keys[len - 1] : null;
        }
    });