import { streamObject } from 'ai';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import {
    getAIProvider,
    isRetryableAIError,
    BASE_SYSTEM_PROMPT,
    getTemporalAnchorBlock,
    formatMbtiForPrompt,
    buildPairFactualLockBlock,
    wrapResponseWithFactualGuard,
} from './_utils/ai-provider';
import { authenticateUser, releaseServiceReceipt } from './_utils/auth';
import { loveSajuSchema } from '../src/config/schemas';

export const config = {
    runtime: 'edge',
};

const STATIC_LOVE_SAJU_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

당신은 사주 합충과 성향 심리를 정밀 융합하여 인연의 기운과 실전 대처 전략을 도출하는 냉철하고도 사려 깊은 연애 명리학 전문가입니다.

[핵심 원칙]
1. 사용자 입력의 [시간적 기준 정보](올해 2026년 병오년, 내년 2027년 정미년)를 기준으로 예측하고, 2023년/2024년/2025년을 올해로 언급하지 마십시오.
2. 일간 합(갑기합토, 을경합금, 병신합수, 정임합목, 무계합화) 및 지지 합충(삼합, 방합, 육합, 충, 형, 파, 해)을 객관적 팩트로 정밀 분석하세요.
3. 도화살, 홍염살, 원진살 등 특수 신살이 있으면 과도한 겁주기 없이 건조하고 담담하게 풀이하세요.
4. 연애운/인연의 기운과 관계 리스크는 현실적이고 냉정하게 예측하고, 행동 지침과 마무리는 내담자의 마음을 헤아리는 따뜻하고 현실적인 조언으로 제시하세요.
5. 마크다운 강조 기호(**)와 이모티콘/이모지는 절대 사용 금지입니다. 글머리표(-)와 줄바꿈(\\n\\n)으로 가독성을 확보하세요.
6. MBTI가 미입력인 경우 억지로 특정 MBTI 유형을 가정하지 말고 사주 원국의 기질 중심으로 관계 소통 전략을 서술하세요.
7. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요. (핵심 명리학 용어는 한자 병기)`;

export default async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const responseHeaders = getCorsHeaders(req);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: responseHeaders 
        });
    }

    let receiptToRelease: string | null = null;
    let supabaseForRelease: any = null;

    try {
        const body = await req.json();
        const url = new URL(req.url);
        const type = url.searchParams.get('type') || body.type || 'couple';

        let serviceType = 'LOVE_COUPLE';
        if (type === 'married') serviceType = 'LOVE_MARRIED';
        else if (type === 'marriage') serviceType = 'LOVE_MARRIAGE';
        else if (type === 'reunion') serviceType = 'LOVE_REUNION';
        else if (type === 'crush') serviceType = 'LOVE_CRUSH';

        // 단건 결제 티켓 검증 + Rate Limit
        const authResult = await authenticateUser(req, {
            serviceType,
            allowedServiceTypes: ['LOVE_COUPLE', 'LOVE_MARRIED', 'LOVE_MARRIAGE', 'LOVE_REUNION', 'LOVE_CRUSH'],
            requirePaymentReceipt: true,
            allowAnonymous: true,
        });
        if (authResult.errorResponse) {
            return authResult.errorResponse;
        }
        receiptToRelease = authResult.receiptToken ?? null;
        supabaseForRelease = authResult.supabaseAdmin;

        const {
            birthDate, birthTime, mbti, name, gender,
            targetName, targetBirthDate, targetBirthTime, targetMbti, targetGender,
            separationDate, separationReason,
        } = body;

        if (!birthDate) {
            await releaseServiceReceipt(supabaseForRelease, receiptToRelease);
            return new Response(JSON.stringify({ error: '본인 생년월일 정보가 필요합니다.' }), { 
                status: 400, 
                headers: responseHeaders 
            });
        }

        const mySaju = getPreciseSajuData({ birthDate, birthTime, gender });
        let targetSaju = null;
        if (targetBirthDate) {
            targetSaju = getPreciseSajuData({ birthDate: targetBirthDate, birthTime: targetBirthTime, gender: targetGender });
        }

        if (type !== 'crush' && !targetSaju && targetBirthDate) {
            await releaseServiceReceipt(supabaseForRelease, receiptToRelease);
            return new Response(JSON.stringify({ error: '상대방 생년월일 정보가 필요합니다.' }), { 
                status: 400, 
                headers: responseHeaders 
            });
        }

        const myRichSaju = buildRichSajuContext(mySaju);
        const targetRichSaju = targetSaju ? buildRichSajuContext(targetSaju) : '상대방 정보 없음';

            const reunionContext = type === 'reunion' && (separationDate || separationReason)
                ? `\n[재회 전용 맥락]\n이별 시기: ${separationDate || '미입력'}\n이별 사유: ${separationReason || '미입력'}\n위 이별 원인과 두 사람 원국 충돌 지점을 반드시 연결해 재회 가능성과 현실 전략을 냉정히 짚으세요.\n`
                : '';

            let userQuery = `${getTemporalAnchorBlock()}

[본인 정보]
이름: ${name || '본인'}
성별: ${gender === 'male' ? '남성' : '여성'}
MBTI: ${formatMbtiForPrompt(mbti)}
[본인 사주]
${myRichSaju}

[상대방 정보]
이름: ${targetName || '상대방'}
성별: ${targetGender === 'male' ? '남성' : '여성'}
MBTI: ${formatMbtiForPrompt(targetMbti)}
[상대방 사주]
${targetRichSaju}
${reunionContext}
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
   - "향후 N개월 안에 승부를 봐야 합니다" 또는 "사주명리학적으로 1년간은 서로 간의 흐름이 불리합니다" 등 사실적 타임라인 기운을 선제시하고 500자 이상으로 종합 제언 및 승부 행동 지침을 서술하십시오.

${buildPairFactualLockBlock({
    mySaju,
    myMbti: mbti,
    myName: name,
    partnerSaju: targetSaju,
    partnerMbti: targetMbti,
    partnerName: targetName,
})}`;

            let receiptReleased = false;
            const safeReleaseReceipt = async () => {
                if (receiptReleased) return;
                receiptReleased = true;
                await releaseServiceReceipt(supabaseForRelease, receiptToRelease);
            };

            try {
                let lastError;
                for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                        const { model } = getAIProvider(attempt);
                        const result = await streamObject({
                            model,
                            schema: loveSajuSchema,
                            system: STATIC_LOVE_SAJU_SYSTEM_PROMPT,
                            prompt: userQuery,
                            temperature: 0.4,
                            maxOutputTokens: 16384,
                            maxRetries: 0,
                            onError: async () => { await safeReleaseReceipt(); },
                            onFinish: async ({ object, error }) => {
                                if (!object || error) await safeReleaseReceipt();
                            },
                        });
                        return wrapResponseWithFactualGuard(
                            result.toTextStreamResponse({ headers: responseHeaders }),
                            {}
                        );
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
        await releaseServiceReceipt(supabaseForRelease, receiptToRelease);
        console.error('Love Saju API Error:', error);
        return new Response(JSON.stringify({ error: '연애 사주 분석 중 오류가 발생했습니다.' }), { 
            status: 500, 
            headers: responseHeaders 
        });
    }
};
