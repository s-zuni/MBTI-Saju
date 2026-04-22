import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { calculateSaju } from './_utils/saju';
import { getAIProvider } from './_utils/ai-provider';

type VercelRequest = any;
type VercelResponse = any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ message: 'Missing orderId' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data: request, error: fetchError } = await supabase
            .from('deep_report_requests')
            .select('*, profiles:user_id(name)')
            .eq('order_id', orderId)
            .single();

        if (fetchError || !request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.generated_data) {
            return res.status(200).json({ success: true, message: 'Already generated' });
        }

        const name = request.profiles?.name;
        const { mbti, birth_info, report_type, special_requests, partner_info } = request;

        let userSaju = null;
        if (birth_info) {
            const [bDate, bTime] = birth_info.split(' ');
            userSaju = calculateSaju(bDate, bTime || '12:00');
        }

        const isMbtiMode = report_type && report_type.includes('MBTI');
        const hasSpecialRequest = special_requests && special_requests.trim() !== '' && special_requests !== '없음';

        const expertPersona = isMbtiMode
            ? `당신은 명리학 35년 경력의 현직 역술인이자 공인 MBTI 전문가입니다.`
            : `당신은 명리학 35년 경력의 현직 역술인입니다.`;

        const specialRequestSchema = hasSpecialRequest
            ? `  "specialRequestAnalysis": "(상세 분석)",\n  "specialRequestKeywords": ["핵심1", "핵심2", "핵심3"],`
            : `  "specialRequestAnalysis": "",\n  "specialRequestKeywords": [],`;

        const systemPrompt = `${expertPersona} 프리미엄 심층 리포트를 작성합니다.

[핵심 요구사항]
반드시 아래의 JSON 구조에 맞춰 **순수한 JSON 객체 하나만** 응답하세요.

[JSON 스키마]
{
  "luckyItems": {
    "color": "행운의 색상과 활용법",
    "number": "행운의 숫자와 의미",
    "direction": "도움되는 방향",
    "habit": "일상 습관 1가지"
  },
  "congenitalSummary": "▶ 소주제... (1,000자 이상)",
  "congenitalKeywords": ["키워드1", "키워드2", "키워드3"],
  "wealthAnalysis": "...",
  "wealthKeywords": ["직업운", "재물축적", "투자성향"],
  "relationshipAnalysis": "...",
  "relationshipKeywords": ["인복", "연애운", "사회성"],
  "healthAnalysis": "...",
  "healthKeywords": ["주의기관", "에너지", "관리법"],
  "macroDecadeTrend": "...",
  "macroDecadeKeywords": ["대운흐름", "전성기", "준비기"],
  "yearlyLuckDetail": "...",
  "yearlyLuckKeywords": ["내년운세", "내후년운세", "3년전략"],
  "riskAnalysis": "...",
  "riskKeywords": ["주의사항", "방어기제", "해결책"],
  "coreLifeMission": "...",
  "coreLifeKeywords": ["사명", "목표", "가치"],
${specialRequestSchema}
  "strategicDirective": "▶ 지침... (체크리스트용 구체적 지침들)",
  "strategicKeywords": ["핵심지침1", "핵심지침2", "핵심지침3"],
  "quarterlyLuck": [
    { "period": "1분기", "summary": "흐름 요약", "point": "행동 지침" }
  ]
}

[작성 수칙]
1. 모든 필드는 매우 상세하게 작성.
2. 각 필드별 'Keywords'는 해당 분석 내용을 관통하는 단어 3개 선정.
3. 실질적이고 현실적인 행운 아이템 추천.
4. 오직 JSON만 출력.`;

        const sajuContext = userSaju ? `[사주] 일간: ${userSaju.dayMaster.chinese}, 오행: 목${userSaju.elementRatio.wood} 화${userSaju.elementRatio.fire} 토${userSaju.elementRatio.earth} 금${userSaju.elementRatio.metal} 수${userSaju.elementRatio.water}` : '';
        const userQuery = `이름: ${name}, MBTI: ${mbti}, 생년월일시: ${birth_info}, 유형: ${report_type}, 요청: ${special_requests}\n${sajuContext}`;

        const { model } = getAIProvider(0);
        const { text } = await generateText({ model, system: systemPrompt, prompt: userQuery, maxTokens: 8192 } as any);

        let cleanedText = text.trim();
        if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
        }

        const parsedData = JSON.parse(cleanedText);
        const dataToSave = { ...parsedData, userSaju, reportType: report_type, mbti, clientName: name, birthInfo: birth_info };

        await supabase.from('deep_report_requests').update({ generated_data: dataToSave, generated_at: new Date().toISOString(), status: 'paid' }).eq('order_id', orderId);

        return res.status(200).json({ success: true, message: 'Generated' });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
