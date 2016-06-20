angular.module('pics',[])

.controller('ctrl',["$http", '$scope', function($http, $scope){
    this.snapshot = function(){
        $http({
            method: 'POST',
            url: '/snapshot/1'});
    };


    var loc = window.location, new_uri;
    if (loc.protocol === "https:") {
        new_uri = "wss:";
    } else {
        new_uri = "ws:";
    }
    new_uri += "//" + loc.host;
    new_uri += loc.pathname;

    var ws = new WebSocket(new_uri);

    ws.onmessage = function(event) {
        console.log(event);
    }

}]);