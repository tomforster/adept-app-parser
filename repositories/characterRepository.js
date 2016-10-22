/**
 * Created by Tom on 20/08/2016.
 */

"use strict";

var db = require('./../db.js').db;
var moment = require('moment');
const log = require('better-logs')('character_repo');

exports.saveSimpleCharacter = function(character, realm, data, guildId){
    log.debug("saving character:", character, realm);
    return db.one("insert into character(name, realm, data, last_updated) values ($1, $2, $3, $4) on conflict on constraint character_name_realm_uk do update set data = EXCLUDED.data returning id", [character, realm, data, moment().unix()])
        .then(result => db.one('insert into guild_character (guild, character) VALUES ($1, $2) on conflict on constraint guild_character_uk do update set guild = EXCLUDED.guild returning character', [guildId, result.id]))
        .then(result => db.one('select * from character where id = $1 limit 1', [result.character]));
};

exports.updateCharacterAudit = function(id, data){
    return db.one("update character set full_data = $1, audit_last_updated = $2 where id = $3 returning id, data, last_updated, full_data, audit_last_updated", [data, moment().unix(), id]);
};

exports.fetchCharacter = function(characterId){
    log.debug('fetching character');
    return db.oneOrNone("select id, data, full_data, last_updated, audit_last_updated from character where id = $1", [characterId]);
};

exports.addToTeam = function(team, character){
    return db.none('insert into team_character (team, character) values ($1, $2)', [team, character]);
};

exports.removeFromTeam = function(team, character){
    return db.none('delete from team_character where team = $1 and character = $2', [team, character]);
};

exports.fetchGuildCharacters = function(guildId){
    log.debug("Fetching guild characters", guildId);
    return db.manyOrNone("select c.id, c.data, c.last_updated from guild g join guild_character gc on gc.guild = g.id join character c on gc.character = c.id where g.id = $1", [guildId]);
};

exports.saveGuild = function(name, realm){
    return db.one("insert into guild(name, realm, last_updated) values ($1, $2, $3) returning id, name, realm, last_updated", [name, realm, moment().unix()]);
};

exports.fetchGuild = function(name, realm){
    return db.oneOrNone("select * from guild where lower(name) = lower($1) and lower(realm) = lower($2) limit 1", [name, realm]);
};

exports.fetchTeams = function(guildId){
    return db.manyOrNone("select * from team where guild = $1", [guildId]);
};

exports.fetchTeamCharacters = function(teamId){
    log.debug("Fetching team characters", teamId);
    return db.manyOrNone("select c.id, c.full_data, c.audit_last_updated from team t join team_character tc on tc.team = t.id join character c on tc.character = c.id where t.id = $1", [teamId]);
};

exports.saveTeam = function(guildId, name){
    return db.one("insert into team (guild, name) VALUES ($1, $2) returning id, guild, name", [guildId, name]);
};

exports.removeTeam = function(teamId){
    return db.none("delete from team_character where team = $1", [teamId])
        .then(() => db.none("delete from team where id = $1", [teamId]));
};