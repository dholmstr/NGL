function getAddress(inputAddress){
	window.alert(inputAddress);
	$(inputAddress).autocomplete({
            source: function (request, response) {
                $.ajax({
                    url: "db/test",
                    dataType: "json",
                    response: ($.map(data, function(v,i){
                        return {
                            value: v.name
                        }}))
                });
            }
})
};	