import { streamObject } from 'ai';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import {
    getAIProvider,
    isRetryableAIError,
    BASE_SYSTEM_PROMPT,
    getTemporalAnchorBlock,
    formatMbtiForPrompt,
} from './_utils/ai-provider';
import { authenticateUser, releaseServiceReceipt } from './_utils/auth';
import { compatibilitySchema } from '../src/config/schemas';

export const config = {
    runtime: 'edge',
};

// 정적 시스템 프롬프트 (OpenAI Prompt Caching 최적화: 1,024+ 토큰 고정 접두사)
const STATIC_COMPATIBILITY_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

당신은 두 사람의 사주 기운과 성향 심리를 정밀 분석하여 현실적 관계 전략을 제공하는 전문 명리학 & 심리 컨설턴트입니다.
            
[AI 사주 직접 계산 엄금 및 사실 수용 규칙]
★ 중요: 너는 생년월일시를 바탕으로 사주 원국, 오행, 십신을 절대로 직접 계산하려고 시도하지 마라!
★ 사용자 입력에 제공된 [System Context: Deterministic Saju Data] 사주 데이터는 코드 엔진(manseryeok)이 계산한 100% 사실 데이터이다. 이 데이터를 절대 변형하지 말고 그대로 수용하여 심리/궁합 해석만 진행하라.

[분석 결과 구성 지침 (반드시 아래 순서와 분량을 지키세요)]:
(1) details.ideal_mbti (성향과 관계 패턴 분석 — 450~600자, 3문단 \\n\\n)
   - 결론을 먼저 제시하고, 서로 잘 맞는 결뿐 아니라 갈등이 터지는 말투·생활 습관과 현실 대처법을 냉철하게 설명하세요. (MBTI 미입력 시 사주 기질 중심으로 풀어낼 것)
(2) details.ideal_saju (사주 오행·합충·신살 궁합 — 450~600자, 3문단 \\n\\n)
   - 사주 용어(오행 등)는 반드시 한글과 한자를 병기하세요. (예: 목(木), 화(火))
(3) details.overall_compatibility (관계 심층 진단 및 조언 — ★반드시 1,600~2,200자 이상 작성할 것★)
   - 뻔하거나 추상적인 표현은 철저히 배제하고, 사주명리학적으로 어떤 부분이 잘 맞고 어떤 부분에서 부딪히는지 냉정하게 정밀 진단하세요.
   - 반드시 [시간적 기준 정보](올해 2026년 병오년, 내년 2027년 정미년)를 기준으로 서술하고 2023/2024/2025년을 올해로 언급하지 마십시오.
   - 아래 4가지 영역을 글머리표(-)와 문단 줄바꿈(\\n\\n)으로 깊이 있게 구성하세요:
     - 사주(운명) 정밀 진단: 일간 합충, 오행 균형, 신살을 바탕으로 한 마찰·시너지 진단 (500자 이상)
     - 인연의 시간적 변화 흐름 (올해 2026년 하반기~6개월 / 내년 2027년 / 향후 3년): 시기별 냉정한 흐름 예측과 구체적 행동강령 (500자 이상)
     - 승부/관계 진전 솔루션: 시기에 맞춘 냉철한 판단 기준 (400자 이상)
     - 관계 소통 매뉴얼 및 따뜻한 조언: 실수 방지·갈등 해소법과 스스로를 지키는 담백하고 따뜻한 조언 (500자 이상)

[규칙]:
1. 언어: MBTI 용어를 제외한 모든 내용은 한국어만 사용하세요. 영어나 영어의 한글 음차 병기는 절대 금지합니다.
2. 가독성: 줄 바꿈(\\n\\n)을 충분히 사용해 문단이 답답하지 않게 나누세요.
3. 서식: 마크다운 강조 기호(**), __, # 및 이모지/이모티콘을 절대 사용하지 마세요. 글머리표(-)만 사용하세요.
4. 톤앤매너: 진단은 냉정한 팩트로, 마무리는 따뜻하고 현실적인 조언으로 제시하세요.
`.trim();

export default async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const reqCorsHeaders = getCorsHeaders(req);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: reqCorsHeaders 
        });
    }

    // 궁합 단건 결제 티켓 검증 및 Rate Limit
    const authResult = await authenticateUser(req, {
        serviceType: 'COMPATIBILITY',
        allowedServiceTypes: ['COMPATIBILITY'],
        requirePaymentReceipt: true,
        allowAnonymous: true,
    });
    if (authResult.errorResponse) {
        return authResult.errorResponse;
    }

    try {
        const body = await req.json();
        const myProfile = body.myProfile || {
            name: body.userName,
            birthDate: body.userBirthDate,
            birthTime: body.userBirthTime,
            mbti: body.userMbti,
            gender: body.userGender
        };
        const isPartnerMode = body.isPartnerMode !== false;
        const relationshipType = body.relationshipType || 'lover';

        let partnerProfile: any = null;
        if (isPartnerMode) {
            partnerProfile = body.partnerProfile || {
                name: body.targetName,
                birthDate: body.targetBirthDate,
                birthTime: body.targetBirthTime,
                mbti: body.targetMbti,
                gender: body.targetGender
            };
        }

        if (!myProfile.birthDate || (isPartnerMode && !partnerProfile?.birthDate)) {
            await releaseServiceReceipt(authResult.supabaseAdmin, authResult.receiptToken);
            return new Response(JSON.stringify({ error: 'Missing profile information.' }), { 
                status: 400, 
                headers: reqCorsHeaders 
            });
        }

        const mySaju = getPreciseSajuData({
            birthDate: myProfile.birthDate,
            birthTime: myProfile.birthTime,
            gender: myProfile.gender
        });
        const mySajuContext = buildRichSajuContext(mySaju);
        
        let partnerSaju: any = null;
        let partnerSajuContext = '';
        if (isPartnerMode && partnerProfile?.birthDate) {
            partnerSaju = getPreciseSajuData({
                birthDate: partnerProfile.birthDate,
                birthTime: partnerProfile.birthTime,
                gender: partnerProfile.gender
            });
            partnerSajuContext = buildRichSajuContext(partnerSaju);
        }

        const relationshipKoreanMap: { [key: string]: string } = {
            lover: '연인 (Lover)',
            friend: '친구 (Friend)',
            family: '가족 (Family)',
            boss: '직장 상사 (Boss)',
            colleague: '직장 동료 (Colleague)',
            other: '그 외 (Other)'
        };
        const relationshipStr = relationshipKoreanMap[relationshipType] || '연인';

        let userQuery = `${getTemporalAnchorBlock()}

[관계 목적]
${relationshipStr}

[대상 A (본인) 기본 프로필]
이름: ${myProfile.name || '본인'}
성별: ${myProfile.gender === 'male' ? '남성' : '여성'}
MBTI: ${formatMbtiForPrompt(myProfile.mbti)}

[대상 A (본인) 사주 데이터]
${mySajuContext}

`;

        if (isPartnerMode && partnerProfile && partnerSaju) {
            userQuery += `[대상 B (상대방) 기본 프로필]
이름: ${partnerProfile.name || '상대방'}
성별: ${partnerProfile.gender === 'male' ? '남성' : partnerProfile.gender === 'female' ? '여성' : '미지정'}
MBTI: ${formatMbtiForPrompt(partnerProfile.mbti)}

[대상 B (상대방) 사주 데이터]
${partnerSajuContext}

위 정보를 바탕으로 두 사람의 '${relationshipStr}' 관점에서의 심층 궁합 분석을 수행해 주세요.`;
        } else {
            userQuery += `위 정보를 바탕으로 본인의 '이상형(궁합)'과 관계 조언을 수행해 주세요. 특히 ${relationshipStr} 관점에서 어떤 스타일의 사람을 만나야 성공적인지 분석해 주세요.`;
        }

        let receiptReleased = false;
        const safeReleaseReceipt = async () => {
            if (receiptReleased) return;
            receiptReleased = true;
            await releaseServiceReceipt(authResult.supabaseAdmin, authResult.receiptToken);
        };

        try {
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model } = getAIProvider(attempt);
                    const result = await streamObject({
                        model,
                        schema: compatibilitySchema,
                        system: STATIC_COMPATIBILITY_SYSTEM_PROMPT,
                        prompt: userQuery,
                        maxOutputTokens: 16384,
                        maxRetries: 0,
                        onError: async () => { await safeReleaseReceipt(); },
                        onFinish: async ({ object, error }) => {
                            if (!object || error) await safeReleaseReceipt();
                        },
                    });
                    return result.toTextStreamResponse({ headers: reqCorsHeaders });
                } catch (error) {
                    lastError = error;
                    if (!isRetryableAIError(error)) break;
                }
            }
            throw lastError;
        } catch (err) {
            throw err;
        }
    } catch (error: any) {
        await releaseServiceReceipt(authResult.supabaseAdmin, authResult.receiptToken);
        console.error('Compatibility API Error:', error);
        return new Response(JSON.stringify({ error: '궁합 분석 중 오류가 발생했습니다.' }), { 
            status: 500, 
            headers: reqCorsHeaders 
        });
    }
};
