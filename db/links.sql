CREATE TABLE link
(
    id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR NOT NULL,
    type VARCHAR(25),
    url VARCHAR NOT NULL,
    date_added INTERVAL NOT NULL,
    is_deleted boolean default false not null,
    user_id INTEGER NOT NULL
      CONSTRAINT link_discord_user_id_fk
        REFERENCES discord_user
);