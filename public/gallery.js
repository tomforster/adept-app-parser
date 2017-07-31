document.addEventListener("DOMContentLoaded", function(){
    document.getElementById("button-snapshot").onclick = function(){
        console.log("Making Snapshot");
        var http = new XMLHttpRequest();
        http.open("POST", path+'/snapshot/livingroom', true);
        http.send();
    };
    var pathArr = window.location.pathname.split("/");
    pathArr.pop();
    var path = pathArr.join('/');
});