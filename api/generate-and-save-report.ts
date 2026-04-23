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
            ? `  "specialRequestAnalysis": "▶ 특별 요청 분석\\n\\n- 내용 (2,000자 이상 상세 분석)",\n  "specialRequestKeywords": ["핵심1", "핵심2", "핵심3"],`
            : `  "specialRequestAnalysis": "",\n  "specialRequestKeywords": [],`;

        const systemPrompt = `${expertPersona} 이 사람만을 위한 프리미엄 심층 분석 리포트를 작성합니다.

[절대 준수 규칙 — 위반 시 무효]
1. **영어 단어 사용 완전 금지**: 본문, 제목, 불렛포인트, 키워드 어디에도 영어를 사용하지 마세요.
   - 금지 예시: water → 수(水), fire → 화(火), wood → 목(木), metal → 금(金), earth → 토(土)
   - 방향도 한글: North → 북, South → 남, East → 동, West → 서
2. **오직 JSON만 출력**: 마크다운 코드블록, 설명 텍스트 없이 순수 JSON만 응답하세요.
3. **메타 텍스트 금지**: "(이상)", "(분량)", "(상세 분석)" 등 지시문 텍스트는 절대 출력 금지.
4. **문단 구분 필수**: 각 소주제 사이에는 반드시 빈 줄(\\n\\n)로 구분하고, 불렛포인트는 각각 개행(\\n- )으로 구분하세요.
5. **오행 표기**: 목(木), 화(火), 토(土), 금(金), 수(水) — 한글(한자) 조합만 사용.

[JSON 스키마]
{
  "luckyItems": {
    "color": "행운의 색상과 구체적인 활용 방법",
    "number": "행운의 숫자와 그 의미 및 활용법",
    "direction": "도움이 되는 방향 및 이유",
    "habit": "일상에서 실천할 핵심 습관 1가지"
  },
  "congenitalSummary": "▶ 선천 기질 핵심\\n\\n- 내용1\\n- 내용2\\n\\n▶ 일간의 특성과 운명적 기질\\n\\n- 내용1\\n- 내용2\\n\\n▶ 오행 에너지 분포와 삶의 패턴\\n\\n- 내용1\\n- 내용2",
  "congenitalKeywords": ["키워드1", "키워드2", "키워드3"],

  "wealthAnalysis": "▶ 재물운의 근본 구조\\n\\n- 내용\\n\\n▶ 직업 적성 및 유망 분야\\n\\n- 내용\\n\\n▶ 재물 축적 전략\\n\\n- 내용\\n\\n▶ 투자 성향 및 주의 사항\\n\\n- 내용\\n\\n▶ 직업운 피크 시기와 저조 시기\\n\\n- 내용",
  "wealthKeywords": ["직업운", "재물축적", "투자성향"],

  "relationshipAnalysis": "▶ 대인관계 전반 분석\\n\\n- 내용\\n\\n▶ 강점과 매력 포인트\\n\\n- 내용\\n\\n▶ 관계에서 나타나는 특징과 패턴\\n\\n- 내용 (예시 포함)\\n\\n▶ 종합 주의사항\\n\\n- 내용\\n\\n▶ 실전 관계 전략 (구체적 예시 포함)\\n\\n- 내용\\n\\n▶ 연애 및 이성 관계 분석\\n\\n- 내용\\n\\n▶ 인복(人福) 분석\\n\\n- 내용",
  "relationshipKeywords": ["인복", "연애운", "사회성"],

  "healthAnalysis": "▶ 사주로 보는 체질과 건강 기반\\n\\n- 내용\\n\\n▶ 주의해야 할 건강 위험 요소\\n\\n- 내용\\n\\n▶ 에너지 리듬과 생체 사이클\\n\\n- 내용\\n\\n▶ 정신 건강 및 스트레스 관리\\n\\n- 내용\\n\\n▶ 식이 요법 및 운동 권고\\n\\n- 내용\\n\\n▶ 건강 관리 실천 로드맵\\n\\n- 내용",
  "healthKeywords": ["주의기관", "에너지", "관리법"],

  "macroDecadeTrend": "▶ 대운(大運)의 이해\\n\\n- 내용\\n\\n▶ 향후 1년차 운세\\n\\n- 길조: 내용\\n- 주의사항: 내용\\n\\n▶ 향후 2년차 운세\\n\\n- 내용\\n\\n▶ 향후 3년차 운세\\n\\n- 내용\\n\\n▶ 향후 4년차 운세\\n\\n- 내용\\n\\n▶ 향후 5년차 운세\\n\\n- 내용\\n\\n▶ 향후 6년차 운세\\n\\n- 내용\\n\\n▶ 향후 7년차 운세\\n\\n- 내용\\n\\n▶ 향후 8년차 운세\\n\\n- 내용\\n\\n▶ 향후 9년차 운세\\n\\n- 내용\\n\\n▶ 향후 10년차 운세\\n\\n- 내용\\n\\n▶ 10년 종합 분석\\n\\n- 내용",
  "macroDecadeKeywords": ["대운흐름", "전성기", "준비기"],

  "partnerAnalysis": "▶ 이 사람과 잘 맞는 파트너 유형\\n\\n- 내용\\n\\n▶ 직장 및 사회 관계에서 곁에 두어야 할 유형\\n\\n- 내용\\n\\n▶ 연애·결혼 파트너로 적합한 유형\\n\\n- 내용\\n\\n▶ 반드시 피해야 할 파트너 유형\\n\\n- 내용\\n\\n▶ 직장에서 피해야 할 인물 유형\\n\\n- 내용\\n\\n▶ 냉정한 관계 진단 기준\\n\\n- 내용",
  "partnerKeywords": ["맞춤파트너", "피해야할유형", "관계전략"],

  "riskAnalysis": "▶ 대인관계 리스크\\n\\n- 내용\\n- 방어 전략: 내용\\n\\n▶ 연애 및 결혼 리스크\\n\\n- 내용\\n- 방어 전략: 내용\\n\\n▶ 재물 및 투자 리스크\\n\\n- 내용\\n- 방어 전략: 내용\\n\\n▶ 건강 리스크\\n\\n- 내용\\n- 방어 전략: 내용\\n\\n▶ 커리어 및 사업 리스크\\n\\n- 내용\\n- 방어 전략: 내용\\n\\n▶ 종합 방어 전략 및 위기 탈출 플랜\\n\\n- 내용",
  "riskKeywords": ["주의사항", "방어기제", "해결책"],

  "coreLifeMission": "▶ 이 사람의 운명적 본질\\n\\n- 내용\\n\\n▶ 삶의 핵심 사명\\n\\n- 내용\\n\\n▶ 삶을 대하는 올바른 자세\\n\\n- 내용\\n\\n▶ 구체적 행동 강령\\n\\n- 행동 강령 1: 내용\\n- 행동 강령 2: 내용\\n- 행동 강령 3: 내용\\n- 행동 강령 4: 내용\\n- 행동 강령 5: 내용\\n\\n▶ 인생의 중요한 결정을 내릴 때 기준\\n\\n- 내용\\n\\n▶ 운명을 개척하는 핵심 전략\\n\\n- 내용\\n\\n▶ 이 운명이 주는 최종 메시지\\n\\n- 내용",
  "coreLifeKeywords": ["사명", "목표", "가치"],

${specialRequestSchema}
  "strategicDirective": "▶ 이 사람은 누구인가\\n\\n- 내용\\n\\n▶ 핵심 운명 전략\\n\\n- 전략 1: 내용\\n- 전략 2: 내용\\n- 전략 3: 내용\\n\\n▶ 반드시 명심해야 할 사항\\n\\n- 명심사항 1: 내용\\n- 명심사항 2: 내용\\n- 명심사항 3: 내용\\n\\n▶ 절대 하지 말아야 할 것\\n\\n- 주의사항 1: 내용\\n- 주의사항 2: 내용\\n\\n▶ 10년 내 반드시 이루어야 할 과업\\n\\n- 내용\\n\\n▶ 최종 선언\\n\\n- 내용",
  "strategicKeywords": ["핵심지침1", "핵심지침2", "핵심지침3"],
  "quarterlyLuck": [
    { "period": "1분기 (1~3월)", "summary": "이 시기 대운 흐름과 에너지 패턴 상세 설명", "point": "집중해야 할 구체적 행동 지침" },
    { "period": "2분기 (4~6월)", "summary": "이 시기 대운 흐름과 에너지 패턴 상세 설명", "point": "집중해야 할 구체적 행동 지침" },
    { "period": "3분기 (7~9월)", "summary": "이 시기 대운 흐름과 에너지 패턴 상세 설명", "point": "집중해야 할 구체적 행동 지침" },
    { "period": "4분기 (10~12월)", "summary": "이 시기 대운 흐름과 에너지 패턴 상세 설명", "point": "집중해야 할 구체적 행동 지침" }
  ]
}

[작성 수칙 — 엄수]
1. 영어 단어 절대 사용 금지 (MBTI 유형명 4글자 표기는 예외).
2. 메타 텍스트 출력 절대 금지.
3. 각 필드 최소 분량: congenitalSummary 1,500자, wealthAnalysis 1,800자, relationshipAnalysis 3,000자, healthAnalysis 2,000자, macroDecadeTrend 2,500자, partnerAnalysis 2,500자, riskAnalysis 2,500자, coreLifeMission 3,500자, strategicDirective 2,500자.
4. 모든 ▶ 소주제 이후에는 반드시 빈 줄(\\n\\n)로 구분하고, 불렛포인트는 각각 \\n- 로 시작.
5. 오직 JSON만 출력.`;

        const sajuContext = userSaju ? `[사주] 일간: ${userSaju.dayMaster.chinese}(${userSaju.dayMaster.korean}), 오행: 목(木)${userSaju.elementRatio.wood}% 화(火)${userSaju.elementRatio.fire}% 토(土)${userSaju.elementRatio.earth}% 금(金)${userSaju.elementRatio.metal}% 수(水)${userSaju.elementRatio.water}%` : '';
        const userQuery = `이름: ${name}, MBTI: ${mbti}, 생년월일시: ${birth_info}, 유형: ${report_type}, 요청: ${special_requests}\n${sajuContext}`;

        const { model } = getAIProvider(0);
        const { text } = await generateText({ model, system: systemPrompt, prompt: userQuery, maxTokens: 12000 } as any);

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
