
CREATE OR REPLACE VIEW v_size_intelligence_summary AS
SELECT 
  tenant_id,
  as_of_date,
  COUNT(DISTINCT product_id) AS total_products,
  AVG(size_health_score) AS avg_health_score,
  COUNT(DISTINCT product_id) FILTER (WHERE curve_state = 'major_break') AS broken_count,
  COUNT(DISTINCT product_id) FILTER (WHERE curve_state = 'minor_break') AS risk_count,
  COUNT(DISTINCT product_id) FILTER (WHERE size_health_score BETWEEN 60 AND 79) AS watch_count,
  COUNT(DISTINCT product_id) FILTER (WHERE curve_state = 'full_curve') AS healthy_count,
  COUNT(DISTINCT product_id) FILTER (WHERE core_size_missing = true) AS core_missing_count
FROM state_size_health_daily
GROUP BY tenant_id, as_of_date;
