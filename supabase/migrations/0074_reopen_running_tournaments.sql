-- ESPN reports running tennis tournaments as STATUS_FINAL; undo those writes
-- for events whose ends_at is still ahead.

update events
   set result_status = null
 where result_status = 'finished'
   and ends_at > now()
   and ends_at - starts_at > interval '1 day'
   and home_score is null and away_score is null
   and merged_into_event_id is null;
