/*
 *  Copyright 2017, Natalia Gavrilenko and Daniel Holmström
 *  Licenced under MIT licence
 */

head.load([
    "app/scripts/lib/jquery.js",
], function() {

    $(document).on('ready', function(){
        $('main').css({
            'min-height': $(window).height() - $('header').height() - $('#control-panel').first().height() - $('footer').height() - 20 + 'px'
        });

        var section = $('main').find('section').first();
        if(typeof section === 'object' && section.length > 0){
            $('#map-container').css({
                'height': $('main').height()
                - parseInt($(section).css('margin-top'))
                - parseInt($(section).css('margin-bottom'))
                - parseInt($(section).css('padding-top'))
                - parseInt($(section).css('padding-bottom'))
                + 'px'
            });
        }

        /*
        var soundInput = $('#sound-input').first();
        $('#sound-button').on('click', function(){
            if($(this).hasClass('active')){
                $(this).removeClass('active');
                $(soundInput).val(0);
            } else {
                $(this).addClass('active');
                $(soundInput).val(1);
            }
        });
        */
    });
});