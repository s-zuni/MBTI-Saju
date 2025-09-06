// /api/analyze.js  — Vercel Serverless Function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 같은 도메인이면 생략 가능
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, gender, birth_date, birth_time, mbti } = req.body || {};
    if (!name || !gender || !birth_date || !birth_time || !mbti) {
      return res.status(400).json({ error: 'missing fields' });
    }

    // 간단 검증
    const mbtiOk = /^[EI][SN][TF][JP]$/i.test(mbti);
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(birth_date);
    const timeOk = /^\d{2}:\d{2}$/.test(birth_time);
    if (!mbtiOk || !dateOk || !timeOk) {
      return res.status(400).json({ error: 'invalid input format' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'missing OPENAI_API_KEY' });

    const messages = [
      {
        role: 'system',
        content: '당신은 MBTI와 사주 해석 전문가입니다. 한국 MZ세대가 읽기 쉬운 톤으로 간결하게 설명하세요. 각 섹션은 2~3문장.'
      },
      {
        role: 'user',
        content:
`다음 사람의 정보를 바탕으로 [공통 성향, 연애운, 직업운, 재물운]을 분석하고, JSON으로만 답하세요.

이름: ${name}
성별: ${gender}
생년월일: ${birth_date}
출생시간: ${birth_time}
MBTI: ${mbti}

JSON 스키마:
{
  "trait": "문장",
  "love": "문장",
  "career": "문장",
  "money": "문장"
}`
      }
    ];

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',   // 접근 안 되면 gpt-3.5-turbo 사용
        temperature: 0.7,
        max_tokens: 700,
        messages,
        response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: 'openai_failed', detail: text });
    }

    const data = await resp.json();
    let parsed;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch {
      parsed = { trait: '', love: '', career: '', money: data.choices?.[0]?.message?.content || '' };
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'server_error', detail: String(e) });
  }
}
