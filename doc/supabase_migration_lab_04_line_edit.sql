-- 피드백 랩 마이그레이션 04 — 판정 항목 유형에 '첨삭(line_edit)' 추가
-- FA-0.12 수정고 첨삭 모드: R모드 단계 4가 line_edits 항목을 판정 대상으로 저장한다.
-- Supabase SQL Editor에서 실행.

alter table lab_items drop constraint if exists lab_items_item_type_check;
alter table lab_items add constraint lab_items_item_type_check
  check (item_type in ('strength','issue','question','setting','line_edit'));

alter table lab_gold drop constraint if exists lab_gold_item_type_check;
alter table lab_gold add constraint lab_gold_item_type_check
  check (item_type in ('strength','issue','question','setting','knowledge_state','line_edit'));
