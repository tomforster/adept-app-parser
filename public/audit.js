/**
 * Created by Tom on 19/08/2016.
 */

"use strict";

angular.module('audit',[])

    .controller('ctrl', ['$scope', '$http', function($scope) {
        this.members = guildInfo.characters;
        this.teams = guildInfo.teams;
        this.auditedMembers = [];
        this.currentTeam = null;

        var new_uri;
        if (location.protocol === "https:") {
            new_uri = "wss:";
        } else {
            new_uri = "ws:";
        }
        new_uri += "//" + location.host + '/auditsocket';

        var wsPromise = new Promise((resolve, reject) => {
            var ws = new WebSocket(new_uri);
            ws.onopen = (event) => {
                resolve(ws);
            };

            ws.onmessage = event => {
                var message = JSON.parse(event.data);
                switch(message.header){
                    case 'add':
                        $scope.$apply(() => {
                            console.log(message.body);
                            if(this.currentTeam && this.currentTeam.id === message.body.team){
                                this.auditedMembers.push(message.body.character);
                            }
                        });
                        break;
                    case 'team':
                        $scope.$apply(() => {
                            console.log(message.body);
                            if(this.currentTeam && this.currentTeam.id === message.body.team){
                                this.auditedMembers.push.apply(this.auditedMembers, message.body.characters);
                            }
                        });
                        break;
                }
            }
        });

        this.characterClick = (character) => {
            if(this.currentTeam !== null) {
                wsPromise.then(ws => {
                    ws.send(JSON.stringify({header: 'add', body: {team: this.currentTeam.id, character: character}}));
                })
            }
        };

        this.teamClick = (team) => {
            if(this.currentTeam === team){
                this.currentTeam = null;
                this.auditedMembers.length = 0;
            }else{
                this.currentTeam = team;
                this.auditedMembers.length = 0;
                wsPromise.then(ws => {
                    ws.send(JSON.stringify({header: 'team', body: {team: this.currentTeam.id}}));
                });
            }
        }

    }]);
