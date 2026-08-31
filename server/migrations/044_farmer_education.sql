-- Farmer Education & Extension Resources: a knowledge portal. Two
-- deliberate honesty scopes here, consistent with this session's approach
-- elsewhere: "video tutorials" store video URLs/metadata only (linking out
-- to externally-hosted video) rather than building real video
-- hosting/transcoding infrastructure this app doesn't have; "success
-- stories" are curated FROM a real performance_ratings row (the actual
-- farmer feedback already recorded in this app) rather than inventing
-- testimonials. "Offline-accessible content" reuses the EXISTING
-- client-side cache-fallback mechanism (seedLotRealtimeClient.ts's
-- requestWithCacheFallback, already used elsewhere) — these are plain,
-- cacheable GET endpoints, no new offline plumbing needed on either side.
-- "Agronomic advisory linked to planted variety" wraps the EXISTING
-- cropPlanning.getAgroAdvisory(crop) rather than duplicating its content.

CREATE TABLE cultivation_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  stage VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cultivation_guides_crop_variety ON cultivation_guides (crop, variety, status);

CREATE TABLE video_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INT CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  topic VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_video_tutorials_crop_variety ON video_tutorials (crop, variety, status);

CREATE TABLE disease_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop VARCHAR(100) NOT NULL,
  disease_name VARCHAR(150) NOT NULL,
  symptoms TEXT NOT NULL,
  management_steps TEXT NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('low', 'moderate', 'high', 'severe')),
  reference_image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_disease_guides_crop ON disease_guides (crop, status);

-- Deliberately foreign-keyed to a REAL performance_ratings row rather than
-- storing free-text farmer name/quote fields — a "success story" here is
-- always traceable back to genuine, previously-recorded farmer feedback,
-- not a fabricated testimonial.
CREATE TABLE success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_rating_id UUID NOT NULL REFERENCES performance_ratings(id) ON DELETE CASCADE,
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100) NOT NULL,
  headline VARCHAR(200) NOT NULL,
  curated_summary TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  curated_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (performance_rating_id)
);
CREATE INDEX idx_success_stories_crop_variety ON success_stories (crop, variety, featured);

CREATE TABLE qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop VARCHAR(100),
  variety VARCHAR(100),
  farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  asked_by VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qa_questions_crop_variety ON qa_questions (crop, variety);
CREATE INDEX idx_qa_questions_status ON qa_questions (status);

CREATE TABLE qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  answered_by VARCHAR(100) NOT NULL,
  expert_role VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qa_answers_question_id ON qa_answers (question_id);
