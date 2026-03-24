import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

type VercelRequest = any;
type VercelResponse = any;

export default async (req: VercelRequest, res: VercelResponse) => {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { myProfile, partners } = req.body;

        if (!myProfile || !partners || !Array.isArray(partners)) {
            return res.status(400).json({ error: 'Invalid input. myProfile and partners array are required.' });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!GEMINI_API_KEY) {
            console.error('[Daily Relationship API] Missing GEMINI_API_KEY');
            return res.status(500).json({ error: '서버 설정 오류: API 키가 누락되었습니다.' });
        }

        // Calculate Saju for User
        const mySaju = calculateSaju(myProfile.birthDate, myProfile.birthTime);

        // Prepare data for AI
        const partnersData = partners.map((p: any) => {
            const pSaju = calculateSaju(p.birthDate, p.birthTime);
            return {
                id: p.id,
                name: p.name,
                relation: p.relation,
                mbti: p.mbti,
                saju: {
                    dayMaster: pSaju.dayMaster.korean,
                    elements: pSaju.elementRatio
                }
            };
        });

        const systemPrompt = `
        You are a relationship master.
        Compare the user (Person A) with a list of partners (Person B, C, D...).
        For EACH partner, provide a daily compatibility score (0-100) and a ONE-LINE tip for today.
        
        User (A): 
        - MBTI: ${myProfile.mbti}
        - Day Master: ${mySaju.dayMaster.korean}
        - Elements: Wood ${mySaju.elementRatio.wood}%, Fire ${mySaju.elementRatio.fire}%, ...

        Partners List:
        ${JSON.stringify(partnersData.map(p => ({
            id: p.id,
            name: p.name,
            relation: p.relation,
            mbti: p.mbti,
            dayMaster: p.saju.dayMaster
        })), null, 2)}

        Current Date: ${new Date().toLocaleDateString('ko-KR')}

        **OUTPUT FORMAT**:
        Return a JSON ARRAY where each object corresponds to a partner:
        [
            {
                "id": "partner_id_from_input",
                "score": 85,
                "msg": "One short sentence advice for today (Korean)."
            },
            ...
        ]
        `;

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: systemPrompt + "\n절대적 금지 사항 (CRITICAL): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요. ** 을 사용하면 시스템 오류가 발생합니다. 문단 간 공백과 이모지를 활용하여 상세히 설명하세요." 
        });

        const result = await generateContentWithRetry(model, {
            contents: [{ role: 'user', parts: [{ text: "Analyze daily chemistry for all partners." }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const responseText = result.response.text();
        const content = cleanAndParseJSON(responseText);

        res.status(200).json(content);

    } catch (error: any) {
        console.error('Daily Relationship API Error:', error);
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
};
