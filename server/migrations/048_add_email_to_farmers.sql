-- "Farmers must have email" (Master Data validation rules). The column is
-- nullable at the DB level — existing rows and any direct-SQL test fixture
-- inserts (server/tests/factories/farmer.factory.ts) stay valid — because
-- the requirement is enforced where the other master-data "required field"
-- rules already live: in the application/service layer, with a friendly
-- ValidationError message, not a DB NOT NULL constraint.
ALTER TABLE farmers ADD COLUMN email VARCHAR(150);

CREATE INDEX idx_farmers_email ON farmers (email);
