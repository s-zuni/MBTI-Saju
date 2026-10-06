import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, Header, Footer, PageNumber } from 'docx';
import { saveAs } from 'file-saver';

const GAN_SINGLE_KOREAN: Record<string, string> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계'
};
const ZHI_SINGLE_KOREAN: Record<string, string> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진',
  '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유',
  '戌': '술', '亥': '해'
};

function parseContentToParagraphs(text: string): Paragraph[] {
  if (!text) return [];
  const lines = text.split('\n');
  return lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return new Paragraph({ spacing: { after: 120 } });
    }
    const hl = trimmed.startsWith('💡')
      ? { label: '핵심 요약', color: '713F12', fill: 'FEF9C3', prefix: '💡' }
      : trimmed.startsWith('[중요]')
        ? { label: '실천 팁', color: '9F1239', fill: 'FFE4E6', prefix: '[중요]' }
        : trimmed.startsWith('[결론]')
          ? { label: '결론', color: '3730A3', fill: 'E0E7FF', prefix: '[결론]' }
          : null;
    if (hl) {
      return new Paragraph({
        children: [
          new TextRun({ text: `${hl.label}  `, bold: true, size: 20, color: hl.color, font: 'Malgun Gothic' }),
          new TextRun({ text: trimmed.slice(hl.prefix.length).trim().replace(/\*\*/g, ''), size: 22, color: hl.color, font: 'Malgun Gothic' }),
        ],
        shading: { type: ShadingType.SOLID, color: hl.fill },
        spacing: { before: 80, after: 120 },
      });
    }
    const bulletMatch = trimmed.match(/^([-•*+]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      return new Paragraph({
        children: [new TextRun({ text: bulletMatch[2] || '', size: 22, font: 'Malgun Gothic' })],
        bullet: { level: 0 },
        spacing: { after: 80 },
      });
    }
    // Remove bold markdown tags ** in DOCX simple preview if any
    const cleanText = trimmed.replace(/\*\*/g, '');
    return new Paragraph({
      children: [new TextRun({ text: cleanText, size: 22, font: 'Malgun Gothic' })],
      spacing: { after: 100 },
    });
  });
}

function createSectionTitle(title: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 32, font: 'Malgun Gothic', color: '0F172A' })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' } },
  });
}

function createSubTitle(subtitle: string, color: string = '1E293B'): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: subtitle, bold: true, size: 26, font: 'Malgun Gothic', color })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: '6366F1' } },
    indent: { left: 200 },
  });
}

const KO_TO_HANJA_GAN: Record<string, string> = Object.fromEntries(Object.entries(GAN_SINGLE_KOREAN).map(([h, k]) => [k, h]));
const KO_TO_HANJA_ZHI: Record<string, string> = Object.fromEntries(Object.entries(ZHI_SINGLE_KOREAN).map(([h, k]) => [k, h]));
const labelChar = (ch: string | undefined, toKo: Record<string, string>, toHanja: Record<string, string>) => {
  if (!ch || ch === '?') return '-';
  const ko = toKo[ch] || ch;
  const hanja = toHanja[ko] || (toKo[ch] ? ch : '');
  return hanja ? `${ko}(${hanja})` : ko;
};

function createSajuTable(saju: any): Table | null {
  if (!saju?.pillars) return null;
  const pillars = [saju.pillars.hour, saju.pillars.day, saju.pillars.month, saju.pillars.year];
  const headers = ['시주(時柱)', '일주(日柱)', '월주(月柱)', '년주(年柱)'];

  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20, font: 'Malgun Gothic' })], alignment: AlignmentType.CENTER })],
      shading: { type: ShadingType.SOLID, color: '1E293B' },
      width: { size: 25, type: WidthType.PERCENTAGE },
    })),
  });

  const ganRow = new TableRow({
    children: pillars.map(p => new TableCell({
      children: [new Paragraph({
        children: [
          new TextRun({ text: labelChar(p?.gan, GAN_SINGLE_KOREAN, KO_TO_HANJA_GAN), bold: true, size: 28, font: 'Malgun Gothic' }),
        ],
        alignment: AlignmentType.CENTER,
      }), new Paragraph({
        children: [new TextRun({ text: p?.ganShiShen || '-', size: 18, color: '6366F1', font: 'Malgun Gothic' })],
        alignment: AlignmentType.CENTER,
      })],
      width: { size: 25, type: WidthType.PERCENTAGE },
    })),
  });

  const zhiRow = new TableRow({
    children: pillars.map(p => new TableCell({
      children: [new Paragraph({
        children: [
          new TextRun({ text: labelChar(p?.zhi, ZHI_SINGLE_KOREAN, KO_TO_HANJA_ZHI), bold: true, size: 28, font: 'Malgun Gothic' }),
        ],
        alignment: AlignmentType.CENTER,
      }), new Paragraph({
        children: [new TextRun({ text: p?.zhiShiShen || '-', size: 18, color: '4338CA', font: 'Malgun Gothic' })],
        alignment: AlignmentType.CENTER,
      })],
      width: { size: 25, type: WidthType.PERCENTAGE },
    })),
  });

  return new Table({ rows: [headerRow, ganRow, zhiRow], width: { size: 100, type: WidthType.PERCENTAGE } });
}

const REPORT_LABEL = 'MBTIJU 3개년 심층 리포트';
const formatMonths = (m?: number[]) => (m && m.length ? m.map(x => `${x}월`).join(', ') : '-');
const SCORE_LABELS: [string, string][] = [['wealth', '재물'], ['career', '커리어'], ['love', '인연'], ['health', '건강']];
const scoreText = (sc: any) => SCORE_LABELS.map(([k, l]) => `${l} ${'★'.repeat(sc?.[k] || 0)}${'☆'.repeat(5 - (sc?.[k] || 0))}`).join('   ');

export async function generateDocx(parsedContent: any, sajuData: any, clientName: string) {
  const sections: any[] = [];
  const years: any[] = parsedContent?.threeYearRoadmap?.details || [];
  const range = years.length ? `${years[0].year}~${years[years.length - 1].year}` : '';
  const pageProps = { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } };
  const run = (text: string, o: any = {}) => new TextRun({ text, font: 'Malgun Gothic', size: 22, ...o });

  // --- Cover Page ---
  sections.push({
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: [
      new Paragraph({ spacing: { before: 4000 } }),
      new Paragraph({
        children: [run(range ? `${range} 3개년 프리미엄 사주 리포트` : '프리미엄 사주 리포트', { size: 24, color: '94A3B8' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [run(parsedContent?.cover?.mainTitle || `${clientName} 님 심층 리포트`, { bold: true, size: 52, color: '0F172A' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [run(parsedContent?.cover?.subTitle || '명리학과 심리학의 융합을 통한 인생 설계', { size: 24, color: '64748B' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
      new Paragraph({
        children: [run(`${clientName} 님`, { bold: true, size: 36, color: '1E293B' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 },
      }),
      new Paragraph({
        children: [run(new Date(parsedContent?.generated_at || Date.now()).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), { size: 20, color: '94A3B8' })],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });

  const header = new Header({ children: [new Paragraph({ children: [run(REPORT_LABEL, { size: 16, color: '94A3B8' })], alignment: AlignmentType.RIGHT })] });
  const footer = new Footer({
    children: [new Paragraph({
      children: [
        run(`${REPORT_LABEL} | `, { size: 16, color: '94A3B8' }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8', font: 'Malgun Gothic' }),
        run(' / ', { size: 16, color: '94A3B8' }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8', font: 'Malgun Gothic' }),
      ],
      alignment: AlignmentType.CENTER,
    })],
  });

  const pushSection = (children: any[]) => sections.push({ properties: pageProps, headers: { default: header }, footers: { default: footer }, children });

  const addSection = (title: string, details: any[] | undefined, color: string = '1E293B') => {
    const children: any[] = [createSectionTitle(title)];
    details?.forEach((detail: any) => {
      if (detail.subtitle) children.push(createSubTitle(detail.subtitle, color));
      children.push(...parseContentToParagraphs(detail.content));
    });
    pushSection(children);
  };

  // --- 한눈에 보기 ---
  const sm = parsedContent?.summary;
  if (sm) {
    const children: any[] = [createSectionTitle(`한눈에 보기 · ${range} 요약`)];
    if (sm.keywords?.length) children.push(new Paragraph({ children: [run(sm.keywords.map((k: string) => `#${k}`).join('   '), { bold: true, color: '4338CA' })], spacing: { after: 160 } }));
    if (sm.verdict) children.push(new Paragraph({ children: [run("마스터의 총평  ", { bold: true, size: 20, color: 'B45309' }), run(sm.verdict)], shading: { type: ShadingType.SOLID, color: 'F1F5F9' }, spacing: { after: 200 } }));
    sm.yearOverview?.forEach((y: any) => {
      const tag = y.year === sm.bestYear ? '  [가장 좋은 해]' : y.year === sm.cautionYear ? '  [신중하게 보낼 해]' : '';
      children.push(createSubTitle(`${y.year}년 ${y.ganji || ''}  ${y.yearlyTheme}${tag}`));
      if (y.oneLine) children.push(new Paragraph({ children: [run(y.oneLine)], spacing: { after: 60 } }));
      children.push(new Paragraph({ children: [run(scoreText(y.scores), { size: 20 })], spacing: { after: 40 } }));
      children.push(new Paragraph({ children: [run(`좋은 달: ${formatMonths(y.bestMonths)}    조심할 달: ${formatMonths(y.cautionMonths)}`, { size: 20, color: '475569' })], spacing: { after: 120 } }));
    });
    if (sm.topActions?.length) {
      children.push(createSubTitle('지금 바로 시작할 3가지'));
      sm.topActions.forEach((a: string) => children.push(new Paragraph({ children: [run(a)], bullet: { level: 0 }, spacing: { after: 60 } })));
    }
    pushSection(children);
  }

  // --- 01. 나의 고민에 대한 답 ---
  if (parsedContent?.specialRequestAnalysis) addSection(parsedContent.specialRequestAnalysis.title, parsedContent.specialRequestAnalysis.details, '4F46E5');

  // --- 02. 사주원국 ---
  if (parsedContent?.natalChartAnalysis) {
    const natalChildren: any[] = [createSectionTitle(parsedContent.natalChartAnalysis.title)];
    const dm = sajuData?.userSaju?.dayMaster;
    if (dm) {
      natalChildren.push(new Paragraph({
        children: [run(`본신의 본질: ${dm.chinese} ${dm.korean} (日干)`, { bold: true, size: 26, color: '854D0E' })],
        spacing: { before: 200, after: 100 },
        shading: { type: ShadingType.SOLID, color: 'FEFCE8' },
      }));
      natalChildren.push(new Paragraph({ children: [run(dm.description || '', { color: '92400E' })], spacing: { after: 200 } }));
    }
    const sajuTable = createSajuTable(sajuData?.userSaju);
    if (sajuTable) natalChildren.push(sajuTable);
    natalChildren.push(new Paragraph({ spacing: { after: 200 } }));

    const elRatio = sajuData?.userSaju?.elementRatio;
    if (elRatio) {
      const elemNames: Record<string, string> = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
      natalChildren.push(createSubTitle('오행(五行) 에너지 분포'));
      Object.entries(elemNames).forEach(([key, label]) => {
        const val = elRatio[key] || 0;
        natalChildren.push(new Paragraph({ children: [run(`${label}: ${val}%`, { bold: val > 30 })], spacing: { after: 60 }, indent: { left: 400 } }));
      });
      natalChildren.push(new Paragraph({ spacing: { after: 200 } }));
    }
    parsedContent.natalChartAnalysis.details?.forEach((detail: any) => {
      if (detail.subtitle) natalChildren.push(createSubTitle(detail.subtitle, 'B45309'));
      natalChildren.push(...parseContentToParagraphs(detail.content));
    });
    pushSection(natalChildren);
  }

  if (parsedContent?.coreIdentity) addSection(parsedContent.coreIdentity.title, parsedContent.coreIdentity.details);
  if (parsedContent?.wealthAndCareer) addSection(parsedContent.wealthAndCareer.title, parsedContent.wealthAndCareer.details, '0369A1');
  if (parsedContent?.relationship) addSection(parsedContent.relationship.title, parsedContent.relationship.details, 'BE185D');

  // --- 06. 3개년 로드맵 ---
  if (years.length) {
    const roadmapChildren: any[] = [createSectionTitle(parsedContent.threeYearRoadmap.title || '06. 향후 3개년 심층 로드맵')];
    years.forEach((yearData: any) => {
      roadmapChildren.push(new Paragraph({
        children: [run(`${yearData.year}년 ${yearData.ganji || ''}: ${yearData.yearlyTheme}`, { bold: true, size: 28, color: '4338CA' })],
        spacing: { before: 400, after: 100 },
      }));
      if (yearData.oneLine) roadmapChildren.push(new Paragraph({ children: [run(yearData.oneLine, { color: '64748B' })], spacing: { after: 60 } }));
      if (yearData.scores) {
        roadmapChildren.push(new Paragraph({ children: [run(scoreText(yearData.scores), { size: 20 })], spacing: { after: 40 } }));
        roadmapChildren.push(new Paragraph({ children: [run(`좋은 달: ${formatMonths(yearData.bestMonths)}    조심할 달: ${formatMonths(yearData.cautionMonths)}`, { size: 20, color: '475569' })], spacing: { after: 120 } }));
      }
      yearData.subtopics?.forEach((subtopic: any) => {
        if (subtopic.subtitle) roadmapChildren.push(createSubTitle(`${yearData.year}년 · ${subtopic.subtitle}`));
        roadmapChildren.push(...parseContentToParagraphs(subtopic.content));
      });
    });
    pushSection(roadmapChildren);
  }

  if (parsedContent?.actionPlan) addSection(parsedContent.actionPlan.title, parsedContent.actionPlan.details);

  // Build and download
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Malgun Gothic', size: 22 } } } },
    sections,
  });

  const blob = await Packer.toBlob(doc);
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `프리미엄_심층리포트_${clientName}_${date}.docx`);
}
