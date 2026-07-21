import { createClient } from '@supabase/supabase-js';
import { streamObject } from 'ai';
import { z } from 'zod';
import { calculateSaju, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError } from './_utils/ai-provider';

export const config = {
    runtime: 'edge',
};

const goldSchema = z.object({
    wealthType: z.string(),
    overview: z.string(),
    sajuAnalysis: z.object({
        dayMasterWealth: z.string(),
        wealthStructure: z.string(),
        elementBalance: z.string(),
    }),
    timingAnalysis: z.object({
        currentYear: z.string().describe('올해(2026년) 재물운 시기적 분석'),
        nextYear: z.string().describe('내년(2027년) 재물운 전망'),
        peakPeriod: z.string().describe('향후 3년 내 재물운 최고조 시기와 이유 (2026년 이후 기준)'),
        cautionPeriod: z.string().describe('재물적으로 주의해야 할 시기와 이유 (2026년 이후 기준)'),
    }),
    fieldAnalysis: z.string().describe('분야별 적합도 분석 - 창업/취직/이직 시에만 해당 분야와 사주의 적합도를 면밀히 분석 (300자 이상). 해당없을시 빈 문자열'),
    comparison: z.string().describe('현직 vs 이직 비교 - 이직 사주일 때만 두 직장의 사주적 적합도를 비교 분석 (300자 이상). 해당없을시 빈 문자열'),
    mbtiAdvice: z.object({
        strength: z.string(),
        weakness: z.string(),
        actionPlan: z.string(),
    }),
    score: z.number(),
    luckyElements: z.array(z.string()),
    verdict: z.string(),
    mbtiSajuWealthReport: z.string().optional().describe('MBTI-사주 뼈 때리는 재물 보고서 (마크다운)'),
});

export default async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
        const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Authenticate user
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Authorization header is missing.' }), { 
                status: 401, 
                headers: corsHeaders 
            });
        }
        const token = authHeader.split(' ')[1]!;
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'User not authenticated.' }), { 
                status: 401, 
                headers: corsHeaders 
            });
        }

        if (req.method === 'POST') {
            const body = await req.json();
            const url = new URL(req.url);
            const type = url.searchParams.get('type') || body.type || 'wealth'; // wealth, business, job, jobchange

            const {
                birthDate,
                birthTime,
                mbti,
                name,
                gender,
                businessField,     // for business
                desiredCompany,    // for job
                desiredRole,       // for job
                currentJob,        // for jobchange
                desiredJob         // for jobchange
            } = body;

            if (!birthDate) {
                return new Response(JSON.stringify({ error: '생년월일 정보가 필요합니다.' }), { 
                    status: 400, 
                    headers: corsHeaders 
                });
            }

            let saju = body.sajuData;
            if (!saju) {
                saju = calculateSaju(birthDate, birthTime);
            }

            if (!saju) {
                return new Response(JSON.stringify({ error: '사주 명식을 계산할 수 없습니다.' }), { 
                    status: 400, 
                    headers: corsHeaders 
                });
            }

            const richSajuContext = buildRichSajuContext(saju);

            const systemPrompt = `당신은 50년 경력의 대한민국 최고 사주명리학자이자, 현대 심리학인 MBTI를 완벽하게 통달한 운명 분석 전문가입니다. 당신의 분석은 뜬구름 잡는 위로가 아니라, 내담자의 뼈를 때리는 날카로운 통찰과 소름 돋는 적중률을 자랑합니다. 듣기 좋은 뻔한 소리는 절대 하지 마십시오.

[시간적 기준 정보]
현재 시점은 **2026년**입니다. 올해는 **2026년(병오년)**, 내년은 **2027년(정미년)**입니다. 분석 시 반드시 이 연도를 기준으로 작성하고, 절대로 2023년이나 2024년을 '올해' 혹은 '내년'으로 언급하지 마십시오.

[핵심 분석 원칙]
1. 일간(日干)의 재성(偏財/正財) 배치를 면밀히 분석하세요.
2. 재성의 강약, 관성과의 관계, 식상생재 여부를 반드시 판단하세요.
3. 대운(大運)/세운(歲運) 흐름에서 재물운의 시기적 변화를 구체적으로 제시하세요. (예: '2026년 하반기부터 정재가 투간하여 안정적 수입이 기대된다')
4. MBTI 성향에 기반한 재물 관리 습관, 투자 성향, 커리어 전략을 조언하세요.
5. 쓸데없는 비유나 추상적 표현을 배제하고, 명리학 용어를 정확하게 사용하되 알기 쉽게 풀이하세요.
6. 한자는 반드시 한글과 병기하세요: 편재(偏財), 정재(正財), 식신(食神) 등.
7. 오행 언급 시 영어를 절대 사용하지 마세요: 목(木) O, 목(Wood) X.
8. 마크다운 강조 기호(**)는 일반 필드에선 사용을 피하고 글머리표(-)와 줄바꿈(\n\n)으로 가독성을 확보하세요. 단, mbtiSajuWealthReport 마크다운 보고서 필드의 헤더 및 볼드 강조는 허용됩니다.
9. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요.
10. 예리하고 냉철하게 분석하되, 건설적인 방향을 제시하세요.
11. "노력하면 성공한다", "때가 오면 돈을 번다" 같은 바넘 효과(Barnum Effect) 문장을 철저히 배제하고, MBTI 성향(P의 충동성, J의 계획성 등)이 사주 특정 기운(재성 혼잡, 무재사주 등)과 만났을 때 현실에서 어떤 방식으로 돈을 벌고 잃는지를 구체적인 예시로 뼈 때리며 현실적이고 구체적인 재물 대안을 제공하십시오.
12. mbtiSajuWealthReport 필드에는 반드시 공백 포함 1000자 이상, 1500자 이하의 분량으로 지정된 [마크다운 출력 형식]을 엄격하게 지켜 작성하십시오.`;

            let userQuery = `[이용자 정보]
이름: ${name || '이용자'}
성별: ${gender === 'male' ? '남성' : '여성'}
MBTI: ${mbti}

[사주 정보]
${richSajuContext}

[요청 서비스 유형]: `;

            if (type === 'wealth') {
                userQuery += `내 재물운 보기
- 사용자의 타고난 재물 기운과 그릇 크기를 상세하게 분석해 주세요.
- 어떤 기운을 활용해야 돈이 들어오는지 구체적으로 분석해 주세요.
- mbtiSajuWealthReport 필드에 반드시 아래 [출력 형식]을 정확히 유지하여 공백 포함 1000자 이상, 1500자 이하의 분량으로 소름 돋게 분석하여 한국어 마크다운으로 채워주십시오.

[출력 형식]
### 1. [사용자의 MBTI]와 [일간/핵심기운]이 만난 당신의 재물 그릇
(타고난 재물 본성과 돈을 대하는 태도를 뼈 때리게 분석)

### 2. 당신의 지갑에 구멍이 뚫리는 치명적 이유
(MBTI 단점과 사주 기구신/흉신이 만나 현실에서 돈을 잃는 구체적인 패턴 분석)

### 3. 운명을 비틀어버릴 실전 재물 솔루션
(주식, 부동산, 현금 저축, 사업, 프리랜서 등 구체적인 형태를 짚어가며 극도로 현실적이고 직설적인 조언 제공)

### 4. 사주명리학자의 한 줄 요약
(뇌리에 박힐 강렬하고 단호한 통찰 한 줄)`;
            } else if (type === 'business') {
                userQuery += `창업 및 사업 사주
- 희망 창업/사업 분야: "${businessField || '미지정'}"
- 사용자의 사주 구성이 선택한 사업 분야와 조화를 이루는지 분석해 주세요.
- 동업이 유리한지 독자 운영이 유리한지 명리학적으로 풀이해 주세요.
- mbtiSajuWealthReport 필드에 반드시 아래 [출력 형식]을 정확히 유지하여 공백 포함 1000자 이상, 1500자 이하의 분량으로 소름 돋게 분석하여 한국어 마크다운으로 채워주십시오.

[출력 형식]
### 1. [사용자의 MBTI]와 [식상/재성 배치]가 만드는 사업가적 본성
(타고난 사업 자질과 재물 유입 흐름을 뼈 때리게 분석)

### 2. 창업 전선에서 폭망하기 딱 좋은 치명적 결함
(희망 사업 분야 "${businessField || '미지정'}" 관점과 동업/독자운영의 사주 흉신 및 MBTI적 오판 패턴 분석)

### 3. 돈을 지키고 확장하는 실전 창업 솔루션
(희망 창업 분야의 지속 가능성과 리스크 대비, 구체적인 확장 방향 조언)

### 4. 사주명리학자의 사업 한 줄 요약
(뇌리에 박힐 강렬하고 단호한 통찰 한 줄)`;
            } else if (type === 'job') {
                userQuery += `취직 사주
- 희망 회사: "${desiredCompany || '미지정'}", 희망 직무/역할: "${desiredRole || '미지정'}"
- 사용자의 사주와 선택한 직장이 서로 맞는 기운인지 분석해 주세요.
- 직무와 사용자의 천직/적성이 일치하는지 십성(十星) 배치로 판단해 주세요.
- mbtiSajuWealthReport 필드에 반드시 아래 [출력 형식]을 정확히 유지하여 공백 포함 1000자 이상, 1500자 이하의 분량으로 소름 돋게 분석하여 한국어 마크다운으로 채워주십시오.

[출력 형식]
### 1. [사용자의 MBTI]와 [관성/인성 배치]가 말하는 타고난 직장 운명
(희망 회사/직무 관점에서 직장인으로서의 타고난 성향과 그릇 분석)

### 2. 직장 생활에서 퇴사를 부르는 쥐약 같은 약점
(조직 생활에서 참지 못하는 MBTI적 페르소나와 사주 흉신 간의 충돌 패턴 분석)

### 3. 조직에서 살아남아 돈을 모으는 실전 커리어 솔루션
(희망 직무 "${desiredRole || '미지정'}" 및 회사 환경에서의 생존과 월급 누수 방지 전략)

### 4. 사주명리학자의 직장 한 줄 요약
(뇌리에 박힐 강렬하고 단호한 통찰 한 줄)`;
            } else if (type === 'jobchange') {
                userQuery += `이직 사주
- 현재 직장/업무: "${currentJob || '미지정'}", 이직 희망 분야/직장: "${desiredJob || '미지정'}"
- 현재 직장에 계속 머무는 것이 이득일지, 새로운 곳으로 옮기는 것이 현명할지 냉철하게 판단해 주세요.
- 두 직무 및 환경의 사주적 적합도를 직접 비교해 주세요.
- 대운과 세운의 흐름으로 보아 이직의 최적 타이밍(달/연도)을 짚어 주세요.
- mbtiSajuWealthReport 필드에 반드시 아래 [출력 형식]을 정확히 유지하여 공백 포함 1000자 이상, 1500자 이하의 분량으로 소름 돋게 분석하여 한국어 마크다운으로 채워주십시오.

[출력 형식]
### 1. [사용자의 MBTI]와 [대운/세운 이동수]가 흔드는 이직 심리와 타이밍
(현재와 이직 희망 분야를 바라보는 심리와 사주 이동 기운 분석)

### 2. 이직 후 땅을 치고 후회하게 만드는 치명적 오판
(현직 "${currentJob || '미지정'}" 대비 이직처 "${desiredJob || '미지정'}"에서의 적합도, 그리고 기구신이 들어올 때 저지를 실수 유형 분석)

### 3. 최상의 가치로 이직하여 재물을 높이는 실전 이동 솔루션
(이직 찬성과 반대 결정 및 2026~2027년 세운 기준 최적의 달과 시기별 처방)

### 4. 사주명리학자의 이직 한 줄 요약
(뇌리에 박힐 강렬하고 단호한 통찰 한 줄)`;
            }

            try {
                let lastError;
                for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                        const { model } = getAIProvider(attempt);
                        const result = await streamObject({
                            model,
                            schema: goldSchema,
                            system: systemPrompt,
                            prompt: userQuery,
                            maxRetries: 0,
                        });
                        return result.toTextStreamResponse({ headers: corsHeaders });
                    } catch (error) {
                        lastError = error;
                        if (!isRetryableAIError(error)) break;
                    }
                }
                throw lastError;
            } catch (err) {
                throw err;
            }
        } else {
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
                status: 405, 
                headers: corsHeaders 
            });
        }
    } catch (error: any) {
        console.error('Gold API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
};
