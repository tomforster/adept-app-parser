CREATE TABLE command (id serial primary key, type varchar(50) not null, command varchar(50) not null, url varchar(10000) not null, date_added bigint not null, user_id varchar(1000) not null);

CREATE TABLE discord_user (id serial primary key, discord_id varchar(1000) not null, username varchar(1000) not null, date_added bigint not null);

CREATE TABLE user_message_count (id serial PRIMARY KEY, user_id serial, count bigint );