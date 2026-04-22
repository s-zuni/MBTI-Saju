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
        const systemPrompt = `당신은 20년 경력의 명리학 대가이자 전략 컨설턴트입니다. 
지금부터 결제 완료된 고객의 **1:1 프리미엄 심층 리포트** 데이터를 생성합니다.

[핵심 요구사항]
반드시 아래의 JSON 구조에 맞춰 **순수한 JSON 객체 하나만** 응답하세요. 
설명이나 마크다운 코드 블록을 절대 포함하지 마세요.

[JSON 스키마]
{
  "congenitalSummary": "(1,000자 이상) 분석",
  "wealthAnalysis": "(1,000자 이상) 분석",
  "relationshipAnalysis": "(1,000자 이상) 분석",
  "healthAnalysis": "(1,000자 이상) 분석",
  "macroDecadeTrend": "(1,000자 이상) 분석",
  "monthlyLuckDetail": "(1,000자 이상) 분석",
  "riskAnalysis": "(1,000자 이상) 분석",
  "coreLifeMission": "(1,000자 이상) 분석",
  "strategicDirective": "(1,000자 이상) 분석",
  "quarterlyLuck": [
    { "period": "1분기", "summary": "분기 요약", "point": "지침" },
    { "period": "2분기", "summary": "분기 요약", "point": "지침" },
    { "period": "3분기", "summary": "분기 요약", "point": "지침" },
    { "period": "4분기", "summary": "분기 요약", "point": "지침" }
  ]
}

[작성 수칙]
1. 모든 필드는 반드시 **1,000자 이상의 매우 방대한 분량**이어야 합니다.
2. JSON 문법을 완벽히 준수하세요.`;

        const userQuery = `내담자: ${name}\nMBTI: ${mbti}\n생년월일시: ${birth_info}\n요청: ${special_requests}\n궁합정보: ${JSON.stringify(partner_info)}`;

        // 3. Generate Report
        const { model } = getAIProvider(0);
        const { text } = await generateText({
            model,
            system: systemPrompt,
            prompt: userQuery,
            maxTokens: 8192,
        } as any);

        // 4. Extract & Parse JSON
        let cleanText = text.trim();
        if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
        }

        try {
            const sajuData = JSON.parse(cleanText);

            // 5. Save to DB
            const { error: updateError } = await supabase
                .from('deep_report_requests')
                .update({ 
                    generated_data: sajuData,
                    generated_at: new Date().toISOString(),
                    status: 'paid' 
                })
                .eq('order_id', orderId);

            if (updateError) throw updateError;
        } catch (jsonError) {
            console.error('JSON Parsing failed in background:', jsonError);
            // Fallback: save raw text if it looks like JSON
            if (cleanText.includes('{') && cleanText.includes('}')) {
                 // Try basic repair
                 let repaired = cleanText;
                 const openB = (repaired.match(/{/g) || []).length;
                 const closeB = (repaired.match(/}/g) || []).length;
                 if (openB > closeB) repaired += '}'.repeat(openB - closeB);
                 
                 const sajuData = JSON.parse(repaired);
                 await supabase.from('deep_report_requests').update({ generated_data: sajuData }).eq('order_id', orderId);
            }
        }

        return res.status(200).json({ success: true, message: 'Report generated and saved' });
    } catch (error: any) {
        console.error('Background generation error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
