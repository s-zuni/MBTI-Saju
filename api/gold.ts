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
        currentYear: z.string(),
        nextYear: z.string(),
        peakPeriod: z.string(),
        cautionPeriod: z.string(),
    }),
    fieldAnalysis: z.string().optional(),
    comparison: z.string().optional(),
    mbtiAdvice: z.object({
        strength: z.string(),
        weakness: z.string(),
        actionPlan: z.string(),
    }),
    score: z.number(),
    luckyElements: z.array(z.string()),
    verdict: z.string(),
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

            const systemPrompt = `당신은 50년 경력의 냉철한 재물 명리학 전문가이자, MBTI 심리분석을 겸비한 최고의 커리어 전략가입니다.

[핵심 원칙]
1. 일간(日干)의 재성(偏財/正財) 배치를 면밀히 분석하세요.
2. 재성의 강약, 관성과의 관계, 식상생재 여부를 반드시 판단하세요.
3. 대운(大運)/세운(歲運) 흐름에서 재물운의 시기적 변화를 구체적으로 제시하세요. (예: '2026년 하반기부터 정재가 투간하여 안정적 수입이 기대된다')
4. MBTI 성향에 기반한 재물 관리 습관, 투자 성향, 커리어 전략을 조언하세요.
5. 쓸데없는 비유나 추상적 표현을 배제하고, 명리학 용어를 정확하게 사용하되 알기 쉽게 풀이하세요.
6. 한자는 반드시 한글과 병기하세요: 편재(偏財), 정재(正財), 식신(食神) 등.
7. 오행 언급 시 영어를 절대 사용하지 마세요: 목(木) O, 목(Wood) X.
8. 마크다운 강조 기호(**) 절대 사용 금지. 글머리표(-)와 줄바꿈(\\n\\n)으로 가독성을 확보하세요.
9. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요.
10. 예리하고 냉철하게 분석하되, 건설적인 방향을 제시하세요.`;

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
- 어떤 기운을 활용해야 돈이 들어오는지 구체적으로 분석해 주세요.`;
            } else if (type === 'business') {
                userQuery += `창업 및 사업 사주
- 희망 창업/사업 분야: "${businessField || '미지정'}"
- 사용자의 사주 구성이 선택한 사업 분야와 조화를 이루는지 분석해 주세요.
- 동업이 유리한지 독자 운영이 유리한지 명리학적으로 풀이해 주세요.`;
            } else if (type === 'job') {
                userQuery += `취직 사주
- 희망 회사: "${desiredCompany || '미지정'}", 희망 직무/역할: "${desiredRole || '미지정'}"
- 사용자의 사주와 선택한 직장이 서로 맞는 기운인지 분석해 주세요.
- 직무와 사용자의 천직/적성이 일치하는지 십성(十星) 배치로 판단해 주세요.`;
            } else if (type === 'jobchange') {
                userQuery += `이직 사주
- 현재 직장/업무: "${currentJob || '미지정'}", 이직 희망 분야/직장: "${desiredJob || '미지정'}"
- 현재 직장에 계속 머무는 것이 이득일지, 새로운 곳으로 옮기는 것이 현명할지 냉철하게 판단해 주세요.
- 두 직무 및 환경의 사주적 적합도를 직접 비교해 주세요.
- 대운과 세운의 흐름으로 보아 이직의 최적 타이밍(달/연도)을 짚어 주세요.`;
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
