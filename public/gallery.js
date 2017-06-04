angular.module('pics',[])

.controller('ctrl',["$scope", "$http", '$window', function($scope, $http, $window){
    
    var self = this;

    var pathArr = $window.location.pathname.split("/");
    pathArr.pop();
    var path = pathArr.join('/');
    
    this.snapshot = function(){
        $http({
            method: 'POST',
            url: path+'/snapshot/livingroom'});
        self.snapshotInProgress = true;
        setTimeout(function(){
            self.snapshotInProgress = false;
            $scope.$apply();
        }, 10000);
    };
    
    this.snapshotInProgress = false;

    var new_uri;
    if ($window.location.protocol === "https:") {
        new_uri = "wss:";
    } else {
        new_uri = "ws:";
    }

    new_uri += "//" + $window.location.host +  path + '/socket';

    var ws = new WebSocket(new_uri);

    ws.onmessage = function(event) {
        $window.location.reload();
    }

}]);