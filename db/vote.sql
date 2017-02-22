CREATE TABLE public.vote
(
    id SERIAL PRIMARY KEY,
    image INTEGER NOT NULL,
    date INTEGER NOT NULL,
    "user" INTEGER NOT NULL,
    is_upvote BOOLEAN DEFAULT FALSE  NOT NULL,
    CONSTRAINT vote_command_id_fk FOREIGN KEY (image) REFERENCES command (id),
    CONSTRAINT vote_discord_user_id_fk FOREIGN KEY ("user") REFERENCES discord_user (id)
);