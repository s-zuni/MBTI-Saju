import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
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

    // Initialize Supabase Admin
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 1. Fetch request details
        const { data: request, error: fetchError } = await supabase
            .from('deep_report_requests')
            .select('*, profiles:user_id(name)')
            .eq('order_id', orderId)
            .single();

        if (fetchError || !request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // If already generated, return success
        if (request.generated_data) {
            return res.status(200).json({ success: true, message: 'Already generated' });
        }

        // 2. Setup AI Prompt (Same as generate-deep-report.ts)
        const name = request.profiles?.name;
        const { mbti, birth_info, report_type, special_requests, partner_info } = request;
        
        // Simplified saju context for the background generator
        const systemPrompt = `당신은 20년 경력의 명리학 대가입니다. 1:1 맞춤형 고액 프리미엄 심층 리포트를 작성하세요.
반드시 아래의 JSON 형식을 [SAJU_DATA_JSON: { ... }] 블록 안에 담아 응답의 맨 처음에 출력하세요. 
각 섹션은 최소 1,000자 이상의 방대한 분량이어야 합니다.

[SAJU_DATA_JSON: ${JSON.stringify({ 
  congenitalSummary: "(1,000자 이상) 분석",
  wealthAnalysis: "(1,000자 이상) 분석",
  relationshipAnalysis: "(1,000자 이상) 분석",
  healthAnalysis: "(1,000자 이상) 분석",
  macroDecadeTrend: "(1,000자 이상) 분석",
  monthlyLuckDetail: "(1,000자 이상) 분석",
  riskAnalysis: "(1,000자 이상) 분석",
  coreLifeMission: "(1,000자 이상) 분석",
  strategicDirective: "(1,000자 이상) 분석",
  quarterlyLuck: [
    { period: "1분기", summary: "분기 요약", point: "지침" },
    { period: "2분기", summary: "분기 요약", point: "지침" },
    { period: "3분기", summary: "분기 요약", point: "지침" },
    { period: "4분기", summary: "분기 요약", point: "지침" }
  ]
})}]`;

        const userQuery = `내담자: ${name}\nMBTI: ${mbti}\n생년월일시: ${birth_info}\n요청: ${special_requests}\n궁합정보: ${JSON.stringify(partner_info)}`;

        // 3. Generate Report
        const { model } = getAIProvider(0);
        const { text } = await generateText({
            model,
            system: systemPrompt,
            prompt: userQuery,
            maxTokens: 8192,
        } as any);

        // 4. Extract JSON
        const markerStr = '[SAJU_DATA_JSON:';
        const startIdx = text.indexOf(markerStr);
        if (startIdx !== -1) {
            const jsonStart = startIdx + markerStr.length;
            // Find balanced closing brace
            let openBraces = 0;
            let endIdx = -1;
            for (let i = jsonStart; i < text.length; i++) {
                if (text[i] === '{') openBraces++;
                else if (text[i] === '}') {
                    openBraces--;
                    if (openBraces === 0) {
                        endIdx = i;
                        break;
                    }
                }
            }

            if (endIdx !== -1) {
                const jsonStr = text.substring(jsonStart, endIdx + 1);
                const sajuData = JSON.parse(jsonStr);

                // 5. Save to DB
                const { error: updateError } = await supabase
                    .from('deep_report_requests')
                    .update({ 
                        generated_data: sajuData,
                        generated_at: new Date().toISOString(),
                        status: 'paid' // Ensure status is paid
                    })
                    .eq('order_id', orderId);

                if (updateError) throw updateError;
            }
        }

        return res.status(200).json({ success: true, message: 'Report generated and saved' });
    } catch (error: any) {
        console.error('Background generation error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
