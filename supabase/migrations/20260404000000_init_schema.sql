-- KBO 야구 알리미 초기 스키마
-- Phase 1: Foundation - DB 스키마 마이그레이션

-- users 테이블 (AUTH-01, AUTH-02, AUTH-03)
create table public.users (
  id          uuid primary key default gen_random_uuid(),
  toss_user_key text unique not null,
  team_code   text,
  subscribed  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- games 테이블 (INFRA-01, INFRA-03)
create table public.games (
  id           uuid primary key default gen_random_uuid(),
  game_date    date not null,
  home_team    text not null,
  away_team    text not null,
  status       text not null default 'scheduled',
  home_score   int not null default 0,
  away_score   int not null default 0,
  inning_data  jsonb,
  started_at   timestamptz,
  finished_at  timestamptz,
  is_notified  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- push_logs 테이블 (INFRA-01)
create table public.push_logs (
  id            bigint primary key generated always as identity,
  user_id       uuid not null references public.users(id),
  game_id       uuid not null references public.games(id),
  status        text not null,
  error_message text,
  sent_at       timestamptz not null default now()
);

-- 인덱스
create index idx_games_date_status on public.games(game_date, status);
create index idx_users_toss_user_key on public.users(toss_user_key);
create index idx_push_logs_game_id on public.push_logs(game_id);

-- updated_at 자동 갱신 트리거
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at
  before update on public.users
  for each row execute function update_updated_at_column();

create trigger update_games_updated_at
  before update on public.games
  for each row execute function update_updated_at_column();
