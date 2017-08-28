CREATE TABLE poll
(
  id SERIAL PRIMARY KEY,
  title VARCHAR(256) NOT NULL,
  date_added bigint not null,
  user_id integer not null
    constraint poll_discord_user_id_fk
    references discord_user,
  option1 VARCHAR(256) NOT NULL,
  option2 VARCHAR(256) NOT NULL,
  option3 VARCHAR(256),
  option4 VARCHAR(256),
  option5 VARCHAR(256),
  option6 VARCHAR(256),
  option7 VARCHAR(256),
  option8 VARCHAR(256),
  option9 VARCHAR(256)
);

CREATE TABLE poll_vote
(
  id SERIAL PRIMARY KEY,
  poll int NOT NULL CONSTRAINT poll_vote_poll_fk REFERENCES poll,
  date BIGINT not null,
  user_id int NOT NULL CONSTRAINT poll_vote_discord_user_fk  REFERENCES discord_user,
  option SMALLINT NOT NULL
);

CREATE INDEX poll_vote_poll_user_id_index ON poll_vote (poll, user_id);

ALTER TABLE audit
  ADD poll INT NULL,
  ADD CONSTRAINT audit_poll_id_fk FOREIGN KEY (poll) REFERENCES poll (id);