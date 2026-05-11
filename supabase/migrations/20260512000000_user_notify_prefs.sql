-- F013: 알림 세분화 토글
-- 사용자별로 finish/cancel 알림을 개별 선택할 수 있도록 컬럼 추가.
-- start 알림은 발송 로직이 없으므로 이번 라운드에서 제외.

ALTER TABLE public.kbo_users ADD COLUMN notify_finish boolean NOT NULL DEFAULT true;
ALTER TABLE public.kbo_users ADD COLUMN notify_cancel boolean NOT NULL DEFAULT true;

-- 기존 사용자는 두 알림 모두 ON으로 시작 (기존 subscribed=true 동작과 동일).
-- 발송 조건은 (subscribed AND notify_X) 양쪽 모두 true일 때만 발송된다.
COMMENT ON COLUMN public.kbo_users.notify_finish IS '경기 종료 알림 수신 여부 (subscribed=true와 AND 조건)';
COMMENT ON COLUMN public.kbo_users.notify_cancel IS '경기 취소 알림 수신 여부 (subscribed=true와 AND 조건)';
