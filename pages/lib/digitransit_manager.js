Lava.ClassManager.registerRootNamespace('global', window);

Lava.ClassManager.define(
    'global.DigitransitManager',
    {
        planRequest: {
            from: {
                lat:60.199196699999995,
                lon:24.9397302
            },
            to: {
                lat:60.168438,
                lon:24.929283
            },
            numItineraries:3,
            modes : '\"BUS,TRAM,RAIL,SUBWAY,FERRY,WALK\"'
        },

        legsData: [
            'startTime',
            'endTime',
            'mode',
            'duration',
            'realTime',
            'distance',
            'transitLeg'
        ],

        url: 'https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql',

        init: function(config){
            // TODO: Implementation or remove
            // TODO: Test that jQuery initialized and load if not or re-write without jQuery
        },

        getPlans: function(from, to, callback){
            var result = '';
            result = this._convert(this.planRequest, '', this._getLastKey(this.planRequest));
            console.log('plan(' + result + ')');

            var query = "{" + 'plan(' + result + ')' + " {itineraries {legs {" + this.legsData.join(' ') + "}}}}";
            this._request({"query": query});
        },

        _request: function(data, callback){
            var self = this;
            $.ajax({
                'url': self.url,
                'type': 'POST',
                'contentType': "application/json",
                'data': JSON.stringify(data)
            }).done(function(result){
                console.log(result);
            }).fail(function (jqXHR, textStatus){
                console.log(jqXHR);
                console.log("Request failed: jqXHR: " + jqXHR + " text:"+ textStatus);
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