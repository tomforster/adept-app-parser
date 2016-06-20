angular.module('pics',[])

.controller('ctrl',["$http", '$window', function($http, $window){
    this.snapshot = function(){
        $http({
            method: 'POST',
            url: '/snapshot/1'});
    };

    var new_uri;
    if ($window.location.protocol === "https:") {
        new_uri = "wss:";
    } else {
        new_uri = "ws:";
    }
    new_uri += "//" + loc.host;

    var ws = new WebSocket(new_uri);

    ws.onmessage = function(event) {
        $window.location.reload();
    }

}]);