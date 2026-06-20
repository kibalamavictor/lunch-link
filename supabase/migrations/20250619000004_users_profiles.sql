-- 004_users_profiles.sql

CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL,
  status        user_status NOT NULL DEFAULT 'pending',
  university_id UUID REFERENCES universities(id) ON DELETE RESTRICT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id            UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  semester_id              UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  student_number           TEXT NOT NULL,
  lunchlink_id             TEXT NOT NULL UNIQUE,
  full_name                TEXT NOT NULL,
  email                    TEXT NOT NULL,
  phone                    TEXT NOT NULL,
  photo_url                TEXT,
  photo_status             photo_status NOT NULL DEFAULT 'pending',
  photo_rejection_reason   TEXT,
  account_status           student_account_status NOT NULL DEFAULT 'registered',
  verification_tier        TEXT NOT NULL DEFAULT 'registered'
    CHECK (verification_tier IN ('registered', 'verified', 'sponsored')),
  sponsored                BOOLEAN NOT NULL DEFAULT false,
  last_redemption_at       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, student_number)
);

CREATE INDEX idx_students_university ON students (university_id);
CREATE INDEX idx_students_lunchlink_id ON students (lunchlink_id);
CREATE INDEX idx_students_photo_status ON students (photo_status)
  WHERE photo_status = 'pending';

CREATE TABLE photo_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  status      photo_status NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
