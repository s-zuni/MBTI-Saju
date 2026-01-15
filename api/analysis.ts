import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';

export default async (req: any, res: any) => {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { type, userProfile, partnerProfile } = req.body;
        // type: 'job' | 'compatibility'

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let prompt = "";
        let systemInstruction = "";

        if (type === 'job') {
            systemInstruction = `
            당신은 사주와 MBTI를 결합하여 최고의 커리어 컨설팅을 제공하는 AI 전문가입니다.
            사용자의 생년월일(사주)과 MBTI를 분석하여, 가장 잠재력을 발휘할 수 있는 직업을 추천해주세요.
            
            결과는 반드시 JSON 형식으로 반환해야 합니다:
            {
                "jobs": ["직업1", "직업2", "직업3"],
                "reason": "상세한 분석 내용 (300자 내외). 사용자의 사주 특징(오행 등)과 MBTI 성향을 엮어서 논리적으로 설명."
            }
            `;

            const saju = userProfile.birthDate ? calculateSaju(userProfile.birthDate, userProfile.birthTime) : null;
            prompt = `
            [사용자 정보]
            이름: ${userProfile.name}
            생년월일: ${userProfile.birthDate} ${userProfile.birthTime || '(시간모름)'}
            MBTI: ${userProfile.mbti}
            사주정보: ${saju ? `일주(${saju.dayMaster.korean}), 오행(${JSON.stringify(saju.elementRatio)})` : '정보없음'}
            
            이 사람에게 가장 잘 맞는 직업 3가지와 그 이유를 분석해줘.
            `;
        } else if (type === 'compatibility') {
            systemInstruction = `
            당신은 인간관계와 궁합을 전문적으로 분석하는 AI 카운슬러입니다.
            두 사람의 사주와 MBTI를 바탕으로 관계의 역학, 장점, 주의할 점을 깊이 있게 분석해주세요.
            
            결과는 반드시 JSON 형식으로 반환해야 합니다:
            {
                "score": 85,
                "keywords": "키워드1, 키워드2, 키워드3",
                "desc": "상세한 궁합 분석 내용 (500자 내외). 서로의 성향 차이, 보완점, 더 좋은 관계를 위한 조언 포함."
            }
            `;

            const mySaju = userProfile.birthDate ? calculateSaju(userProfile.birthDate, userProfile.birthTime) : null;
            const partnerSaju = partnerProfile.birthDate ? calculateSaju(partnerProfile.birthDate, partnerProfile.birthTime) : null;

            prompt = `
            [나(User) 정보]
            이름: ${userProfile.name}
            생년월일: ${userProfile.birthDate}
            MBTI: ${userProfile.mbti}
            사주: ${mySaju ? `일주(${mySaju.dayMaster.korean})` : ''}

            [상대방(Partner) 정보]
            이름: ${partnerProfile.name}
            생년월일: ${partnerProfile.birthDate}
            MBTI: ${partnerProfile.mbti}
            사주: ${partnerSaju ? `일주(${partnerSaju.dayMaster.korean})` : ''}
            
            관계: ${partnerProfile.relationshipType || '연인'}
            
            두 사람의 궁합을 분석해줘.
            `;
        } else {
            throw new Error("Invalid analysis type");
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
            generationConfig: { responseMimeType: "application/json" }
        });

        const responseText = result.response.text();
        res.status(200).json(JSON.parse(responseText));

    } catch (error: any) {
        console.error("Analysis API Error:", error);
        res.status(500).json({ error: 'Failed to perform analysis', details: error.message });
    }
};
