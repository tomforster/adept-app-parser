/**
 * Created by Tom on 19/08/2016.
 */

"use strict";

angular.module('audit', ['ui.bootstrap'])

    .controller('ctrl', ['$scope', '$uibModal', function($scope, $uibModal) {
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
                    case 'remove':
                        console.log(message.body);
                        if(this.currentTeam && this.currentTeam.id === message.body.team){
                            for(var i = this.auditedMembers.length - 1; i >= 0; i--) {
                                if(this.auditedMembers[i].id === message.body.character) {
                                    $scope.$apply(() => {
                                        this.auditedMembers.splice(i, 1);
                                    });
                                }
                            }
                        }
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
                    ws.send(JSON.stringify({header: 'add', body: {team: this.currentTeam.id, character: character.id}}));
                })
            }
        };

        this.characterRemove = (character) => {
            if(this.currentTeam !== null) {
                wsPromise.then(ws => {
                    ws.send(JSON.stringify({header: 'remove', body: {team: this.currentTeam.id, character: character.id}}));
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
        };

        this.isSelected = (member) => {
            if(!this.currentTeam) return true;
            if(this.auditedMembers.length == 0) return true;
            return this.auditedMembers.filter(auditedMember => auditedMember.id === member.id).length > 0;

        };

        this.openGuildModal = () => {
            var guildModal = $uibModal.open({
                templateUrl: 'guildModalContent.html',
                scope: $scope
            })
        };

        this.openTeamModal = () => {
            this.teamName = "";

            var guildModal = $uibModal.open({
                templateUrl: 'teamModalContent.html',
                scope: $scope
            });

            this.createTeam = (teamName) => {
                if(this.isValidTeamName(teamName)) {
                    console.log(teamName);
                    guildModal.close();
                }
            };

            this.isValidTeamName = (teamName) => {
                return teamName.length > 3;
            };
        };

    }]);
