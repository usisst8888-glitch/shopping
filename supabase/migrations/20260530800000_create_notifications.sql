-- 회원 알림 (헤더 종 아이콘에 표시)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'order_paid',        -- 입금 확인
    'order_preparing',   -- 배송 준비
    'order_shipping',    -- 배송중
    'order_delivered',   -- 배송 완료
    'order_cancelled',   -- 주문 취소
    'inquiry_reply',     -- 문의 답변 등록
    'points_earned',     -- 포인트 적립
    'points_admin',      -- 관리자 포인트 지급/회수
    'announcement'       -- 공지 (확장 대비)
  )),
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,                       -- 클릭 시 이동 URL (선택)
  read_at TIMESTAMPTZ,              -- NULL = 미확인
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 본인 조회만
CREATE POLICY "알림 조회" ON public.notifications FOR SELECT USING (
  auth.uid() = user_id
);
-- 본인 또는 관리자 INSERT (서버 액션은 자기 사용자 또는 관리자 컨텍스트로 호출됨)
CREATE POLICY "알림 생성" ON public.notifications FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
-- 본인 수정 (읽음 처리 등)
CREATE POLICY "알림 수정" ON public.notifications FOR UPDATE USING (
  auth.uid() = user_id
);
-- 본인 삭제
CREATE POLICY "알림 삭제" ON public.notifications FOR DELETE USING (
  auth.uid() = user_id
);
