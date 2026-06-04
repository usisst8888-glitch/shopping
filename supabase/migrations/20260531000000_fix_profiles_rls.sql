-- profiles RLS 정책 보강
-- 기존: SELECT "본인 프로필 조회"만 있음 → UPDATE/관리자 권한이 모두 차단되어 회원가입 시 추가 필드 silent fail 발생
-- profiles 정책 안에서 같은 테이블을 EXISTS로 참조하면 재귀 위험이 있어 SECURITY DEFINER 헬퍼 함수로 우회

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- 본인 프로필 수정
DROP POLICY IF EXISTS "본인 프로필 수정" ON public.profiles;
CREATE POLICY "본인 프로필 수정" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 관리자: 모든 프로필 조회
DROP POLICY IF EXISTS "관리자 프로필 조회" ON public.profiles;
CREATE POLICY "관리자 프로필 조회" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- 관리자: 모든 프로필 수정
DROP POLICY IF EXISTS "관리자 프로필 수정" ON public.profiles;
CREATE POLICY "관리자 프로필 수정" ON public.profiles
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 관리자: 프로필 삭제
DROP POLICY IF EXISTS "관리자 프로필 삭제" ON public.profiles;
CREATE POLICY "관리자 프로필 삭제" ON public.profiles
  FOR DELETE USING (public.is_admin());
