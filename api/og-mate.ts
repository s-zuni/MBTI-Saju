import { getSajuMateById, isValidSajuMateId } from '../src/config/sajuMateConfig';

export const config = { runtime: 'edge' };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function handler(req: Request): Response {
  const url = new URL(req.url);
  const safeFromName = (url.searchParams.get('fromName') || '').trim().slice(0, 12);
  const mirror = (url.searchParams.get('mirror') || '').trim();

  const hasFriend = Boolean(safeFromName && isValidSajuMateId(mirror));

  let title: string;
  let description: string;
  let image: string;

  if (hasFriend) {
    const char = getSajuMateById(mirror);
    title = `${safeFromName}님의 말랑 사주 메이트는 '${char.name}'! 나랑 케미는 몇 점일까?`;
    description =
      '9종 오리지널 사주 원국 × MBTI로 찾는 내 찰떡 메이트 & 피해야 할 상극 메이트를 무료 만세력 티저로 먼저 확인해 보세요.';
    image = `https://www.mbtiju.com${char.imagePath}`;
  } else {
    title = '내 사주와 찰떡인 말랑 메이트 & 피해야 할 상극 찾기 | MBTIJU';
    description =
      '생년월일시(만세력 4주 8자)와 MBTI로 9종 오리지널 사주 메이트 중 내 찰떡 단짝과 상극 경보 캐릭터를 찾아보세요.';
    image = 'https://www.mbtiju.com/images/saju-mates/yuzu.jpg';
  }

  const canonicalUrl = `https://www.mbtiju.com/mate${url.search}`;

  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedImage = escapeHtml(image);
  const escapedUrl = escapeHtml(canonicalUrl);

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDescription}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapedUrl}" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDescription}" />
  <meta property="og:image" content="${escapedImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDescription}" />
  <meta name="twitter:image" content="${escapedImage}" />
</head>
<body>
  <p>${escapedTitle}</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
