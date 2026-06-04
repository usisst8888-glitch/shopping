-- 사이트별 회원 설정 (가입 정책 + 가입 폼 필드 정의)
-- sites 테이블에 추가
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS login_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS terms_mode TEXT NOT NULL DEFAULT 'agree_step'
    CHECK (terms_mode IN ('agree_step', 'inline_notice', 'disabled')),
  ADD COLUMN IF NOT EXISTS social_signup_require_terms BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS terms_all_includes_optional BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS signup_notice TEXT,
  ADD COLUMN IF NOT EXISTS signup_fields JSONB NOT NULL DEFAULT
    '{
      "name":      { "use": true,  "required": true },
      "gender":    { "use": true,  "required": true },
      "homepage":  { "use": false, "required": false },
      "phone":     { "use": true,  "required": true },
      "address":   { "use": true,  "required": true },
      "birthdate": { "use": true,  "required": true },
      "referrer":  { "use": true,  "required": false }
    }'::jsonb;
