const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { name, gender, birth_date, birth_time, mbti } = req.body;

    if (!name || !gender || !birth_date || !birth_time || !mbti) {
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyCHnto6h-UThCVTRQ9f7ctM1ECrnmnwRWU");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const systemPrompt = `
        당신은 MBTI와 사주 명리학을 결합한 전문 컨설턴트입니다.
        생년월일시를 통해 사주팔자를 분석하고, 이를 MBTI와 결합하여 통찰력 있는 조언을 제공하세요.
        말투는 친절하고 전문적이어야 하며, 각 항목당 공백 포함 300자 내외로 작성하세요.
      `;

      const userQuery = `
        아래 정보를 바탕으로 분석해 주세요.
        이름: ${name}, 성별: ${gender}
        생년월일: ${birth_date}, 출생시간: ${birth_time}
        MBTI: ${mbti}

        다음 5가지를 JSON 형식으로 분석해 주세요.
        1. 사주 분석 (saju): 사주팔자의 기운과 특징
        2. MBTI 분석 (mbti): 해당 유형의 성격적 특징
        3. 공통 성향 (trait): 사주와 MBTI가 만났을 때 나타나는 핵심 성향 (결합 분석)
        4. 추천 직업 (jobs): 성향에 맞는 직업군과 이유
        5. 추천 궁합 (match): 잘 맞는 MBTI나 사주 특징

        응답은 반드시 아래 JSON 구조를 따라야 하며, 다른 텍스트 없이 JSON만 출력하세요:
        {
          "saju": "...",
          "mbti": "...",
          "trait": "...",
          "jobs": "...",
          "match": "..."
        }
      `;

      const result = await model.generateContent([systemPrompt, userQuery]);
      const responseText = result.response.text();
      
      // Attempt to parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
          const content = JSON.parse(jsonMatch[0]);
          res.status(200).json(content);
      } else {
          throw new Error("Invalid response format from AI");
      }

    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: '분석 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};
