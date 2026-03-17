import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

type VercelRequest = any;
type VercelResponse = any;

export default async (req: VercelRequest, res: VercelResponse) => {
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

    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
            throw new Error('Missing environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Authenticate user
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header is missing.' });
        }
        const token = authHeader.split(' ')[1]!;
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'User not authenticated.' });
        }

        if (req.method === 'POST') {
            const { myProfile, partnerProfile, relationshipType = 'lover' } = req.body;

            if (!myProfile || !partnerProfile) {
                return res.status(400).json({ error: 'Missing profile information.' });
            }

            // Calculate Saju for both
            const mySaju = calculateSaju(myProfile.birthDate, myProfile.birthTime);
            const partnerSaju = calculateSaju(partnerProfile.birthDate, partnerProfile.birthTime);

            const relationshipKoreanMap: { [key: string]: string } = {
                lover: '연인 (Lover)',
                friend: '친구 (Friend)',
                family: '가족 (Family)',
                colleague: '동료 (Colleague)',
                other: '그 외 (Other)'
            };
            const relationshipStr = relationshipKoreanMap[relationshipType] || '연인';

            const systemPrompt = `
당신은 MBTI와 Saju(사주명리학)를 가장 매력적이고 전문적으로 융합하여 분석하는 최고의 '관계 컨설턴트(MBTIJU 소울 메이트 전문가)'입니다.
분석 대상자 간의 관계는 "${relationshipStr}" 입니다.
다음 규칙을 엄격하게 준수하여 응답하세요:

[규칙]
1. 언어: 반드시 **한국어(Korean)**로만 답변하세요. 영어는 MBTI 이니셜 등 불가피한 경우에만 사용하세요.
2. 분량 및 구성: 결괏값의 "desc" 항목은 반드시 최소 700자에서 1000자 사이의 길고 상세한 분량이어야 합니다. 성의 없는 짧은 요약은 피하세요.
3. 가독성: 문단을 읽기 좋게 나누세요. **강조를 위해 볼드체(**)를 절대로 사용하지 마세요.** 모든 텍스트는 평문으로 작성하세요.
4. 내용의 깊이:
   - 두 사람의 오행(생극제화)이 서로 어떻게 상호작용하는지 디테일하게 풀어주세요.
   - 제공된 간지(GanZhi) 데이터를 바탕으로 '도화살(매력)', '홍염살(인기)', '역마살(역동성)', '화개살(예술성)' 등 흥미로운 신살(Shensha)이 발견된다면 이를 찾아내어 매력 포인트로 어필하세요. (단, 억지로 지어내진 마세요.)
   - MBTI 성향의 차이(예: T와 F의 대화방식, J와 P의 라이프스타일)와 사주 기질의 차이가 만들어내는 긍정적 시너지와 부정적 마찰 지점을 구체적인 예시와 함께 서술하세요.
   - 관계 개선을 위한 객관적이고 사실적인 분석과 함께, 희망적인 조언을 잊지 마세요.
5. 이모지: 글의 생동감을 위해 💖, ⚡, 🍀, 🤝 등의 이모지를 적절히 섞어 사용하세요.

응답은 반드시 아래 JSON 형식을 따라야 합니다:
{
  "score": 두 사람의 상성 점수 (1~100 사이의 숫자). 극단적인 악연이 아니라면 가급적 70점 이상으로 기분 좋게 부여하세요.,
  "desc": "위에 명시된 700자 이상의 매우 상세하고 흥미로운 분석 내용 전체 (볼드체, 이모지, 줄바꿈 포함)",
  "keywords": "상호보완, 도화살_매력, 티키타카_최고 등 두 사람의 관계를 요약할 수 있는 가장 힙하고 흥미로운 해시태그 키워드 3~4개 (쉼표로 구분)"
}
            `;

            const userQuery = `
            Person A (User):
            - Name: ${myProfile.name}
            - MBTI: ${myProfile.mbti}
            - Saju GanZhi (사주 원국): Year ${mySaju.ganZhi.year}, Month ${mySaju.ganZhi.month}, Day ${mySaju.ganZhi.day}, Hour ${mySaju.ganZhi.hour}
            - Saju Day Master: ${mySaju.dayMaster.korean} (${mySaju.dayMaster.description})
            - Elements: Wood ${mySaju.elementRatio.wood}%, Fire ${mySaju.elementRatio.fire}%, Earth ${mySaju.elementRatio.earth}%, Metal ${mySaju.elementRatio.metal}%, Water ${mySaju.elementRatio.water}%

            Person B (Partner):
            - Name: ${partnerProfile.name}
            - MBTI: ${partnerProfile.mbti}
            - Saju GanZhi (사주 원국): Year ${partnerSaju.ganZhi.year}, Month ${partnerSaju.ganZhi.month}, Day ${partnerSaju.ganZhi.day}, Hour ${partnerSaju.ganZhi.hour}
            - Saju Day Master: ${partnerSaju.dayMaster.korean} (${partnerSaju.dayMaster.description})
            - Elements: Wood ${partnerSaju.elementRatio.wood}%, Fire ${partnerSaju.elementRatio.fire}%, Earth ${partnerSaju.elementRatio.earth}%, Metal ${partnerSaju.elementRatio.metal}%, Water ${partnerSaju.elementRatio.water}%

            Analyze their compatibility as "${relationshipStr}" based on MBTI interaction and Saju elemental balance/harmony. Identify any notable Shensha (신살) like 도화살 or 홍염살 from their GanZhi to make the description more engaging.
            `;

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-3.1-flash-lite-preview",
                systemInstruction: systemPrompt
            });

            const result = await generateContentWithRetry(model, {
                contents: [
                    { role: 'user', parts: [{ text: userQuery }] }
                ],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const responseText = result.response.text();
            const content = JSON.parse(responseText);

            res.status(200).json(content);
        } else {
            res.status(405).json({ error: 'Method Not Allowed' });
        }

    } catch (error: any) {
        console.error('Compatibility API Error:', error);
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
};
