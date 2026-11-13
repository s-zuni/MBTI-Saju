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
    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ success: false, message: '서버 설정이 올바르지 않습니다.' });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let claimedStatus: string | null = null;
    try {
        // 원자적 생성 락 획득: 미생성('generated_data IS NULL') & 결제 완료 상태만 'generating'으로 전이
        const { data: claimed, error: claimError } = await supabase
            .from('deep_report_requests')
            .update({ status: 'generating' })
            .eq('order_id', orderId)
            .in('status', ['paid', 'active'])
            .is('generated_data', null)
            .select('*, profiles:user_id(name)')
            .maybeSingle();

        if (claimError) {
            console.error('generate-and-save-report claim error:', claimError);
            return res.status(500).json({ success: false, message: '리포트 생성 상태 확인 중 오류가 발생했습니다.' });
        }

        if (!claimed) {
            const { data: existing, error: fetchError } = await supabase
                .from('deep_report_requests')
                .select('status, generated_data')
                .eq('order_id', orderId)
                .maybeSingle();

            if (fetchError || !existing) {
                return res.status(404).json({ message: 'Request not found' });
            }

            if (existing.generated_data) {
                return res.status(200).json({ success: true, message: 'Already generated' });
            }

            if (existing.status === 'generating') {
                return res.status(409).json({ success: false, message: '리포트가 이미 생성 중입니다.' });
            }

            return res.status(400).json({ success: false, message: '결제가 승인되지 않아 리포트를 생성할 수 없습니다.' });
        }

        claimedStatus = 'paid';
        const name = claimed.profiles?.name || '내담자';
        const { mbti, birth_info, report_type, special_requests, partner_info, gender } = claimed;

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

        const { error: saveError } = await supabase
            .from('deep_report_requests')
            .update({
                generated_data: dataToSave,
                generated_at: new Date().toISOString(),
                status: 'paid',
            })
            .eq('order_id', orderId);

        if (saveError) {
            throw saveError;
        }

        return res.status(200).json({ success: true, message: 'Generated' });
    } catch (error: any) {
        console.error('generate-and-save-report error:', error);
        if (claimedStatus) {
            // 일시 오류 시 재시도가 가능하도록 생성 락 복구
            await supabase
                .from('deep_report_requests')
                .update({ status: claimedStatus })
                .eq('order_id', orderId)
                .eq('status', 'generating')
                .is('generated_data', null);
        }
        return res.status(500).json({ success: false, message: '리포트 생성 중 오류가 발생했습니다.' });
    }
}
