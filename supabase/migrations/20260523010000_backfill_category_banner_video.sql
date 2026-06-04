-- 기존 공통 카테고리 배너 영상(site_design.category_banner_video_url)을
-- 모든 1차 카테고리의 banner_video_url 기본값으로 복사한다.
-- 카테고리 페이지는 "해당 카테고리 → 1차 부모" 순으로 배너를 찾으므로,
-- 1차 카테고리에만 넣어도 하위(2·3차) 페이지까지 동일 영상이 노출된다.
UPDATE public.categories c
SET banner_video_url = sub.video
FROM (
  SELECT category_banner_video_url AS video
  FROM public.site_design
  WHERE category_banner_video_url IS NOT NULL
  LIMIT 1
) sub
WHERE c.level = 1
  AND c.banner_video_url IS NULL;
