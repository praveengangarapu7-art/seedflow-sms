-- "Labs must have certification type" (Master Data validation rules).
-- Nullable at the DB level for the same reason as farmers.email in
-- 048 — only organizations of type='laboratory' are required to set it,
-- enforced in organizations.service.ts, not by a DB constraint (a CHECK
-- conditioned on another column's value is awkward in Postgres and the
-- friendlier ValidationError path already exists for this).
ALTER TABLE organizations ADD COLUMN certification_type VARCHAR(100);
