import { createClient } from '@supabase/supabase-js';
import { generateDeepReport } from './_utils/report-generator';
import { setNodeCorsHeaders } from './_utils/cors';

type VercelRequest = any;
type VercelResponse = any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setNodeCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { orderId } = req.body || {};
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

        if (request.status !== 'paid' && request.status !== 'active') {
            return res.status(400).json({ success: false, message: '결제가 승인되지 않아 리포트를 생성할 수 없습니다.' });
        }

        if (request.generated_data) {
            return res.status(200).json({ success: true, message: 'Already generated' });
        }

        const name = request.profiles?.name || '내담자';
        const { mbti, birth_info, report_type, special_requests, partner_info, gender } = request;

        const dataToSave = await generateDeepReport({
            name,
            mbti,
            birthInfo: birth_info,
            gender,
            reportType: report_type,
            specialRequest: special_requests,
            partnerInfo: partner_info as any,
        });
        Object.assign(dataToSave, { reportType: report_type, mbti, clientName: name, birthInfo: birth_info });

        await supabase.from('deep_report_requests').update({ generated_data: dataToSave, generated_at: new Date().toISOString() }).eq('order_id', orderId);

        return res.status(200).json({ success: true, message: 'Generated' });
    } catch (error: any) {
        console.error('generate-and-save-report error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
