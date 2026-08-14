import { createClient } from '@supabase/supabase-js';
import { streamObject } from 'ai';
import { z } from 'zod';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError, BASE_SYSTEM_PROMPT } from './_utils/ai-provider';


export const config = {
    runtime: 'edge',
};

const loveSajuSchema = z.object({
    analysisType: z.string(),
    overallScore: z.number(),
    summary: z.string().describe("두 사람의 궁합 핵심을 총평하는 350자 이상의 정밀 요약 서술"),
    sajuCompatibility: z.object({
        dayMasterRelation: z.string().describe("일간 합충 정밀 분석: 잘 맞는 부분과 안 맞는 부분을 명리학적 이유를 들어 냉철하게 500자 이상(3단락 구조)으로 정밀 진단"),
        fiveElementHarmony: z.string().describe("오행 조화 분석: 오행의 과다/부족 및 상생 시너지와 상극 마찰 요인을 500자 이상(3단락 구조)으로 정밀 진단"),
        specialStars: z.string().describe("특수 신살 및 기운: 도화, 홍염, 원진, 귀문 등 신살의 영향과 액땜 실천법을 500자 이상(3단락 구조)으로 정밀 분석"),
        hiddenConflicts: z.string().describe("내재된 잠재 갈등: 겉으로 드러나지 않는 사주/성격적 마찰과 위기 발생 모멘트를 500자 이상(3단락 구조)으로 뼈 때리게 분석"),
    }),
    dimensions: z.array(z.object({
        label: z.string(),
        value: z.number(),
        description: z.string(),
    })),
    timingForecast: z.object({
        sixMonths: z.string().describe("6개월 후: 사주 운세 흐름 정보(200자) + 구체적 행동강령(200자)을 결합하여 총 400자 이상 서술"),
        oneYear: z.string().describe("1년 후: 사주 운세 흐름 정보(200자) + 구체적 행동강령(200자)을 결합하여 총 400자 이상 서술"),
        threeYears: z.string().describe("3년 후: 장기적 사주 운세 흐름(200자) + 구체적 행동강령(200자)을 결합하여 총 400자 이상 서술"),
    }),
    mbtiStrategy: z.object({
        myApproach: z.string().describe("나의 관계 지향적 접근법: 내 MBTI 약점/주의점을 상대방 MBTI와 긴밀히 연계하여 400자 이상으로 뼈 때리게 서술"),
        partnerApproach: z.string().describe("상대를 끌어당기는 공략법: 상대방 MBTI 성향과 사주 기운을 고려해 실전 데이트/소통 냉철한 조언을 400자 이상 서술"),
        conflictResolution: z.string().describe("갈등 임계점 해소법: 사주와 MBTI 궁합을 종합 분석한 갈등 극복 및 즉각 적용 가능한 실전 솔루션을 400자 이상 서술"),
    }),
    specialSection: z.string().describe("마음 포착 및 승부 솔루션: '향후 N개월 안에 승부를 봐야 합니다' 등 사주 기운과 사실적 타임라인을 선제시한 후 500자 이상으로 종합 제언 및 승부 지침 서술"),
    verdict: z.string(),
    keywords: z.array(z.string()),
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
            const type = url.searchParams.get('type') || body.type || 'couple';

        const {
            birthDate, birthTime, mbti, name, gender,
            targetName, targetBirthDate, targetBirthTime, targetMbti, targetGender,
            separationDate, separationReason,
        } = body;

        if (!birthDate) {
            return new Response(JSON.stringify({ error: '본인 생년월일 정보가 필요합니다.' }), { 
                status: 400, 
                headers: corsHeaders 
            });
        }

        const mySaju = getPreciseSajuData({ birthDate, birthTime, gender });
        let targetSaju = null;
        if (targetBirthDate) {
            targetSaju = getPreciseSajuData({ birthDate: targetBirthDate, birthTime: targetBirthTime, gender: targetGender });
        }

        if (type !== 'crush' && !targetSaju && targetBirthDate) {
            return new Response(JSON.stringify({ error: '상대방 생년월일 정보가 필요합니다.' }), { 
                status: 400, 
                headers: corsHeaders 
            });
        }

        const myRichSaju = buildRichSajuContext(mySaju);
        const targetRichSaju = targetSaju ? buildRichSajuContext(targetSaju) : '상대방 정보 없음';

        const systemPrompt = `
${BASE_SYSTEM_PROMPT}

당신은 사주 합충과 MBTI 심리를 정밀 융합하여 인연의 기운과 실전 대처 전략을 도출하는 냉철한 연애 명리학 전문가입니다.

[시간적 기준 정보]
현재 시점은 **2026년**입니다. 올해는 **2026년(병오년)**, 내년은 **2027년(정미년)**입니다. 분석 시 반드시 이 연도를 기준으로 작성하고, 절대로 2023년이나 2024년을 '올해' 혹은 '내년'으로 언급하지 마십시오.

[핵심 원칙]
1. 일간 합(갑기합토, 을경합금, 병신합수, 정임합목, 무계합화) 및 지지 합충(삼합, 방합, 육합, 충, 형, 파, 해)을 객관적 팩트로 정밀 분석하세요.
2. 도화살, 홍염살, 원진살 등 특수 신살이 있으면 과도한 겁주기 없이 건조하고 담담하게 풀이하세요.
3. 연애운/인연의 기운은 '사주 진단(날씨)'으로 전달하고, 실질적 만남이나 관계 개선 조언은 'MBTI에 최적화된 행동 지침(행동, 장소, 대화법)'으로 제시하세요.
4. 재회/짝사랑 사주: 헛된 위로나 공포 조장 없이, 냉정하게 기운의 흐름을 짚어주고 MBTI 기반 구체적 공략 및 대응 행동을 제시하세요.
5. 마크다운 강조 기호(**) 절대 사용 금지. 글머리표(-)와 줄바꿈(\\n\\n)으로 가독성을 확보하세요.
6. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요. (핵심 명리학 용어는 한자 병기)`;

            let userQuery = `[본인 정보]
이름: ${name || '본인'}
성별: ${gender === 'male' ? '남성' : '여성'}
MBTI: ${mbti}
[본인 사주]
${myRichSaju}

[상대방 정보]
이름: ${targetName || '상대방'}
성별: ${targetGender === 'male' ? '남성' : '여성'}
MBTI: ${targetMbti || '알수없음'}
[상대방 사주]
${targetRichSaju}

[요청 서비스 유형]: ${type}
[필수 출력 필드별 작성 템플릿 - 단문 작성 절대 금지, 모든 필드 3단락 작성]
1. sajuCompatibility.dayMasterRelation (일간 합충):
   - 반드시 다음 3단락 포맷으로 작성하고 총 500자 이상 채우세요.
   - [잘 맞는 부분]: 두 사람 일간(日干) 기운 융합과 잘 맞는 명리학적 이유 (200자 이상)
   - [안 맞는 부분]: 일간 합충 및 마찰 원인과 명리학적 이유 (200자 이상)
   - [실전 행동 지침]: 현실 연애에서 서로 조심해야 할 대처법 (100자 이상)

2. sajuCompatibility.fiveElementHarmony (오행 조화):
   - 반드시 다음 3단락 포맷으로 작성하고 총 500자 이상 채우세요.
   - [상생 시너지]: 오행(木火土金水) 배치가 만들어내는 긍정적 기운 (200자 이상)
   - [상극 마찰 요인]: 상대 사주 오행의 결핍/과다로 인해 부딪히는 부분 (200자 이상)
   - [오행 보완책]: 기운의 불균형을 극복하기 위한 생활 속 처방 (100자 이상)

3. sajuCompatibility.specialStars (특수 신살 및 기운):
   - 반드시 다음 3단락 포맷으로 작성하고 총 500자 이상 채우세요.
   - [길살 작용]: 도화살, 홍염살, 천을귀인 등 호감과 끌림의 신살 작용 (200자 이상)
   - [흉살 마찰]: 원진살, 귀문관살, 백호살 등 마찰과 오해를 부르는 신살 작용 (200자 이상)
   - [신살 액땜 수칙]: 흉살의 부정적 영향을 피하기 위한 액땜 실천법 (100자 이상)

4. sajuCompatibility.hiddenConflicts (내재된 잠재 갈등):
   - 반드시 다음 3단락 포맷으로 작성하고 총 500자 이상 채우세요.
   - [잠재 사주 마찰]: 겉으로는 안 드러나는 사주 원국과 성격적 마찰 (200자 이상)
   - [위기 발생 순간]: 관계가 지속될 때 갑작스럽게 폭발할 수 있는 갈등 (200자 이상)
   - [갈등 예방 수칙]: 잠재 갈등을 예방하는 소통 솔루션 (100자 이상)

5. timingForecast (인연의 시간적 변화 흐름):
   - sixMonths, oneYear, threeYears 각각 400자 이상 서술하세요.
   - 각 항목마다 [1] 사주 운세 기운 흐름 정보(예: "내년에 OO 사주는 OO한 연애운이 흘러 관계에 주의가 필요합니다") (200자 이상) + [2] 시기별 구체적인 자세한 행동강령(예: "따라서 OO하고 주의를 기울이세요") (200자 이상)을 결합하여 작성하십시오.

6. mbtiStrategy (MBTI 관계소통 매뉴얼):
   - myApproach (나의 접근법), partnerApproach (상대 공략법), conflictResolution (갈등 해소법) 각각 400자 이상 서술하세요.
   - 내 MBTI 약점을 상대방 MBTI 성향과 긴밀히 직결시키고 실전 데이트/갈등 시나리오 예시와 함께 뼈 때리게 서술하십시오.

7. specialSection (마음 포착 솔루션):
   - "향후 N개월 안에 승부를 봐야 합니다" 또는 "사주명리학적으로 1년간은 서로 간의 흐름이 불리합니다" 등 사실적 타임라인 기운을 선제시하고 500자 이상으로 종합 제언 및 승부 행동 지침을 서술하십시오.`;

            try {
                let lastError;
                for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                        const { model } = getAIProvider(attempt);
                        const result = await streamObject({
                            model,
                            schema: loveSajuSchema,
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
        console.error('Love Saju API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
};
