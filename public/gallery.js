angular.module('pics',[])

.controller('ctrl',["$http", '$window', function($http, $window){
    
    var self = this;
    
    this.snapshot = function(){
        $http({
            method: 'POST',
            url: '/snapshot/1'});
        self.snapshotInProgress = true;
        setTimeout(function(){
            self.snapshotInProgress = false;
        }, 20000);
    };
    
    this.snapshotInProgress = false;

    var new_uri;
    if ($window.location.protocol === "https:") {
        new_uri = "wss:";
    } else {
        new_uri = "ws:";
    }
    new_uri += "//" + $window.location.host + $window.location.pathname;

    var ws = new WebSocket(new_uri);

    ws.onmessage = function(event) {
        $window.location.reload();
    }

}]);