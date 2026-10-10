import { getPreciseSajuData, parseBirthInfo } from './saju';
import { getRoadmapYears, getCurrentYear, getCurrentTermIndex } from './report-years';
import { buildFortuneCtx, computeYearFortune, computeRemainingScores, sumScores, type Scores } from './report-score';

/**
 * 결제 전 무료 미리보기: '올해 남은 기간 + 앞으로 3개년' 분야별 점수표.
 * 점수는 AI 가 아니라 코드가 계산하므로 호출 비용이 없고 결과가 항상 같다.
 * 총평·월별 지도·근거·본문은 유료 리포트에서만 제공하므로 여기서는 절대 반환하지 않는다.
 */

export interface ScorePreviewRow {
    year: number;
    ganji: string;
    /** 올해 남은 기간 행 */
    partial: boolean;
    scores: Scores;
    total: number;
}

export interface ScorePreview {
    rows: ScorePreviewRow[];
}

export class PreviewInputError extends Error {}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function buildScorePreview(input: { birthInfo?: unknown; gender?: unknown }, now: Date = new Date()): ScorePreview {
    const birthInfo = typeof input.birthInfo === 'string' ? input.birthInfo.trim().slice(0, 80) : '';
    const gender = typeof input.gender === 'string' ? input.gender : '';
    if (gender !== 'female' && gender !== 'male') throw new PreviewInputError('성별을 선택해 주세요.');

    const { birthDate, birthTime } = parseBirthInfo(birthInfo);
    const m = DATE_RE.exec(birthDate);
    if (!m) throw new PreviewInputError('생년월일 형식이 올바르지 않습니다.');
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const probe = new Date(Date.UTC(y, mo - 1, d));
    if (y < 1900 || y > now.getFullYear() || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
        throw new PreviewInputError('생년월일을 다시 확인해 주세요.');
    }

    const saju = getPreciseSajuData({ birthDate, ...(birthTime ? { birthTime } : {}), gender });
    const ctx = buildFortuneCtx(saju, y, gender);

    const cur = getCurrentYear(now);
    const curF = computeYearFortune(ctx, cur.year);
    const curScores: Scores = computeRemainingScores(curF, getCurrentTermIndex(now));

    const rows: ScorePreviewRow[] = [
        { year: cur.year, ganji: cur.ganji, partial: true, scores: curScores, total: sumScores(curScores) },
        ...getRoadmapYears(now).map(ry => {
            const f = computeYearFortune(ctx, ry.year);
            return { year: ry.year, ganji: ry.ganji, partial: false, scores: f.scores, total: sumScores(f.scores) };
        }),
    ];
    return { rows };
}
