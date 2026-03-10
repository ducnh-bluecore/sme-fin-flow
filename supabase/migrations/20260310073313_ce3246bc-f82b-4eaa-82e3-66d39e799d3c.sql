INSERT INTO tenant_users (tenant_id, user_id, role, is_active)
VALUES ('364a23ad-66f5-44d6-8da9-74c7ff333dcc', 'eb8c68fd-aea7-4bbc-9a74-6e2360d002fe', 'admin', true)
ON CONFLICT DO NOTHING;