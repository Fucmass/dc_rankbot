create database if not exists rankbot_discord;

create table if not exists users (
    id serial primary key,
    username varchar(255) not null,
    roles varchar(255) not null,
    created_at timestamp default now()
);


