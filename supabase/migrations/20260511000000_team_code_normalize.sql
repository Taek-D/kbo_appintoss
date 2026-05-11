-- kbo_games.home_team / away_team 정규화
-- 기존: kbo-game 패키지가 반환한 raw 값(한글 약어 + 영문 약어 혼재)이 그대로 저장됨
-- 변경 후: miniapp/teams.ts와 동일한 영문 2글자 TeamCode로 통일
--
-- 영향:
--   - 응원팀 저장(kbo_users.team_code), 시즌 위젯 API, 푸시 발송 SQL 모두
--     동일한 코드 체계로 정렬되어 매칭 0건 이슈 해소
--   - crawler-service.ts에 normalizeTeamCode() 매핑이 추가되어 신규 데이터는
--     영문 코드로 들어오므로 이 UPDATE는 1회성 backfill 목적

-- 한글 약어 → 영문 코드
UPDATE public.kbo_games SET home_team = 'OB' WHERE home_team = '두산';
UPDATE public.kbo_games SET away_team = 'OB' WHERE away_team = '두산';

UPDATE public.kbo_games SET home_team = 'LT' WHERE home_team = '롯데';
UPDATE public.kbo_games SET away_team = 'LT' WHERE away_team = '롯데';

UPDATE public.kbo_games SET home_team = 'SS' WHERE home_team = '삼성';
UPDATE public.kbo_games SET away_team = 'SS' WHERE away_team = '삼성';

UPDATE public.kbo_games SET home_team = 'WO' WHERE home_team = '키움';
UPDATE public.kbo_games SET away_team = 'WO' WHERE away_team = '키움';

UPDATE public.kbo_games SET home_team = 'HH' WHERE home_team = '한화';
UPDATE public.kbo_games SET away_team = 'HH' WHERE away_team = '한화';

-- 영문 약어 → 정규 영문 코드
UPDATE public.kbo_games SET home_team = 'KI' WHERE home_team = 'KIA';
UPDATE public.kbo_games SET away_team = 'KI' WHERE away_team = 'KIA';

UPDATE public.kbo_games SET home_team = 'SK' WHERE home_team = 'SSG';
UPDATE public.kbo_games SET away_team = 'SK' WHERE away_team = 'SSG';

-- KT, LG, NC는 이미 영문 정규 코드 — 변경 불필요
