-- ============================================================
--  예약 관련 데이터 전체 정리 (테스트 데이터 삭제)
--  실행: Supabase 대시보드 → SQL Editor → 이 파일 전체 실행
--
--  ✅ 보존 (건드리지 않음)
--    - settings        : 관리자 설정 (숙소명·요금·계좌·비밀번호 해시 등)
--    - photos          : 업로드한 대문/소개 사진 (+ Storage 실제 파일)
--    - push_subscriptions : 관리자 기기 푸시 구독
--
--  🗑 삭제 (예약 관련 전체)
--    - reservations    : 예약 전체 (입금대기/확정/취소/투숙완료 + 숨김 보관함 포함)
--    - reviews         : 예약에 달린 후기 전체 (예약코드 기반이라 함께 정리)
--
--  💡 선택 항목 (기본 보존 — 필요 시 주석 해제)
--    - audit_logs      : 관리자 조작 기록 (예약 기록 포함 — 완전 초기화 시 해제)
--    - blocked_dates   : 휴무일 (예약 일정 정보지만 설정에 가까움 — 기본 보존)
--
--  ⚠️ 삭제 후 복구 불가. 실행 전 Supabase에서 백업(Table Editor > Export 또는
--     자동 백업)을 권장한다.
--  멱등성: 데이터가 없어도 재실행 오류 없음.
-- ============================================================

-- 1) 예약 전체 삭제 — 숨김(소프트삭제) 건까지 전부
delete from reservations;

-- 2) 후기 전체 삭제 — 예약코드 기반 데이터라 예약과 함께 정리
delete from reviews;

-- ── 선택: 관리자 조작 기록까지 완전 초기화하려면 아래 주석 해제 ──
-- delete from audit_logs;

-- ── 선택: 휴무일(예약 불가 날짜)까지 정리하려면 아래 주석 해제 ──
-- delete from blocked_dates;

-- ── 정리 결과 확인 (건수가 0이면 완료) ──
select
  (select count(*) from reservations)      as reservations_count,
  (select count(*) from reviews)           as reviews_count,
  (select count(*) from audit_logs)        as audit_logs_count,
  (select count(*) from photos)            as photos_count_보존,
  (select count(*) from settings)          as settings_count_보존;
