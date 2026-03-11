
-- Delete old job completely so a fresh one is created
DELETE FROM bigquery_backfill_jobs WHERE id = '521ea5c7-948d-4043-bfef-e8a4086f78b4';
-- Also clean up source progress
DELETE FROM backfill_source_progress WHERE job_id = '521ea5c7-948d-4043-bfef-e8a4086f78b4';
