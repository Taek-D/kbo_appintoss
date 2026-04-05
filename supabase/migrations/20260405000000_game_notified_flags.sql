-- Phase 2: is_notified 상태별 분리 + 복합 unique 제약 마이그레이션
-- per D-06, RESEARCH Open Question 2: 단일 is_notified -> 상태별 3개 플래그로 분리

-- is_notified를 상태별 플래그로 분리 (시작/종료/취소 각각 알림 가능)
ALTER TABLE public.games ADD COLUMN is_notified_start boolean NOT NULL DEFAULT false;
ALTER TABLE public.games ADD COLUMN is_notified_finish boolean NOT NULL DEFAULT false;
ALTER TABLE public.games ADD COLUMN is_notified_cancel boolean NOT NULL DEFAULT false;

-- 기존 is_notified 값을 finish로 마이그레이션 (기존 데이터 보존)
UPDATE public.games SET is_notified_finish = is_notified;

-- 기존 is_notified 컬럼 삭제
ALTER TABLE public.games DROP COLUMN is_notified;

-- game_date + home_team + away_team 복합 unique 제약 추가 (upsert onConflict용)
-- RESEARCH Open Question 1: kbo-game id가 DB uuid와 다르므로 복합키로 upsert
ALTER TABLE public.games ADD CONSTRAINT uq_games_date_teams UNIQUE (game_date, home_team, away_team);
