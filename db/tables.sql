CREATE TABLE command (id serial primary key, type varchar(50) not null, command varchar(50) not null, url varchar(10000) not null, date_added bigint not null, user_id varchar(1000) not null);

CREATE TABLE discord_user (id serial primary key, discord_id varchar(1000) not null, username varchar(1000) not null, date_added bigint not null);

CREATE TABLE user_message_count (id serial PRIMARY KEY, user_id serial, count bigint );

CREATE TABLE audit (id serial PRIMARY KEY, type VARCHAR(30) not null, date bigint not null, user_id serial, channel_id varchar(1000), is_bot_message boolean default false);

CREATE INDEX ON audit (type, date);

CREATE TABLE character (
  id serial primary key,
  name VARCHAR(100) not null,
  realm VARCHAR(100) not null,
  data JSONB not null,
  full_data JSONB null,
  last_updated bigint not null,
  audit_last_updated bigint null,
  CONSTRAINT character_name_realm_uk unique(name, realm)
);

CREATE UNIQUE INDEX character_name_realm_idx ON character (name, realm);

CREATE TABLE team (
  id serial primary key,
  name VARCHAR(100),
  guild integer references guild,
  constraint team_name_guild_uk UNIQUE (name, guild)
);

CREATE TABLE team_character (
  team integer REFERENCES team,
  character integer references character,
  CONSTRAINT team_character_uk UNIQUE (team, character)
);

CREATE TABLE guild (
  id serial primary key,
  name VARCHAR(100) not null,
  realm VARCHAR(100) not null,
  last_updated bigint not null
);

CREATE TABLE guild_character (
  guild integer REFERENCES guild,
  character integer references character,
  CONSTRAINT guild_character_uk UNIQUE (guild, character)
);

CREATE TABLE application (
  id SERIAL PRIMARY KEY,
  data JSONB not null,
  date_received BIGINT not null
)