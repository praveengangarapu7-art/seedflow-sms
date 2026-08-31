-- Mobile field-inspection support: a photo captured in the field (stored as
-- a data URL — this demo has no object-storage/CDN infra, so the image is
-- kept inline like other JSONB/text blobs elsewhere in this schema), a GPS
-- fix taken at capture time, and a distinct pest observation alongside the
-- existing disease fields (the mobile app captures "disease/pest
-- observations" as two separate signals, not one).
ALTER TABLE lot_field_inspections
  ADD COLUMN photo_data_url TEXT,
  ADD COLUMN gps_latitude NUMERIC(9, 6),
  ADD COLUMN gps_longitude NUMERIC(9, 6),
  ADD COLUMN pest_detected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN pest_name VARCHAR(150),
  ADD CONSTRAINT chk_pest_name_requires_detection CHECK (NOT pest_detected OR pest_name IS NOT NULL);

-- Expo push tokens registered by the mobile app. One row per physical
-- device install; re-registering the same token (e.g. after re-login)
-- upserts rather than duplicating.
CREATE TABLE device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(150) NOT NULL,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_push_tokens_user_email ON device_push_tokens (user_email);
