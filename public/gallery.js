angular.module('pics',[])

.directive('pic',[function(){
    return {
            restrict: 'E',
            template:   "<div class='col-lg-2 col-md-3 col-sm-4 col-xs-12 thumb'>" +
                            "<a class='thumbnail' ng-href={{image}}> " +
                                "<img class='img-responsive' ng-src={{image}}  alt=''> " +
                            "</a> " +
                            "{{date}} {{time}}"+
                        "</div>",
            scope: {image : "@image", time: "@time", date: "@date"}
    }
}])

.controller('ctrl',["$http", '$scope', function($http, $scope){
    this.images = [];
    var self = this;

    $http({
        method: 'GET',
        url: '/imagelist'
    }).then(function(response){
        self.images = angular.fromJson(response.data);
    }, function(response){
        console.log('ERROR');
    });

    this.snapshot = function(){
        $http({
            method: 'POST',
            url: '/snapshot/1'});
    }
}]);