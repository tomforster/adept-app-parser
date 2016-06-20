angular.module('pics',[])

.controller('ctrl',["$http", '$scope', function($http, $scope){
    this.snapshot = function(){
        $http({
            method: 'POST',
            url: '/snapshot/1'});
    }
}]);