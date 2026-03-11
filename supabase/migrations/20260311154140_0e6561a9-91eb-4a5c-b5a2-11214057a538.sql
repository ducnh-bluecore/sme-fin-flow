-- Reset order_items job for fresh start with fixed code
UPDATE bigquery_backfill_jobs SET status = 'pending', processed_records = 0 
WHERE id = '2b240a09-258b-47c6-8d23-74bc23396b5b';
UPDATE backfill_source_progress SET last_offset = 0, processed_records = 0, status = 'pending' 
WHERE job_id = '2b240a09-258b-47c6-8d23-74bc23396b5b';