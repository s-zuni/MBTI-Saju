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
    const bulletMatch = trimmed.match(/^([-•*+]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      return new Paragraph({
        children: [new TextRun({ text: bulletMatch[2], size: 22, font: 'Malgun Gothic' })],
        bullet: { level: 0 },
        spacing: { after: 80 },
      });
    }
    return new Paragraph({
      children: [new TextRun({ text: trimmed, size: 22, font: 'Malgun Gothic' })],
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
          new TextRun({ text: p?.gan ? `${GAN_SINGLE_KOREAN[p.gan] || p.gan}(${p.gan})` : '-', bold: true, size: 28, font: 'Malgun Gothic' }),
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
          new TextRun({ text: p?.zhi ? `${ZHI_SINGLE_KOREAN[p.zhi] || p.zhi}(${p.zhi})` : '-', bold: true, size: 28, font: 'Malgun Gothic' }),
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

export async function generateDocx(parsedContent: any, sajuData: any, clientName: string) {
  const sections: any[] = [];

  // --- Cover Page ---
  sections.push({
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: [
      new Paragraph({ spacing: { before: 4000 } }),
      new Paragraph({
        children: [new TextRun({ text: 'VIP 프리미엄 전략 보고서', size: 24, color: '94A3B8', font: 'Malgun Gothic' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: parsedContent?.cover?.mainTitle || `${clientName} 님 심층 리포트`, bold: true, size: 52, font: 'Malgun Gothic', color: '0F172A' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [new TextRun({ text: parsedContent?.cover?.subTitle || '명리학과 심리학의 융합을 통한 인생 설계', size: 24, color: '64748B', font: 'Malgun Gothic' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `${clientName} 님`, bold: true, size: 36, font: 'Malgun Gothic', color: '1E293B' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), size: 20, color: '94A3B8', font: 'Malgun Gothic' })],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });

  // --- Helper to add a full section ---
  const addSection = (title: string, details: any[], borderColor: string = '6366F1') => {
    const children: any[] = [createSectionTitle(title)];
    if (details) {
      details.forEach((detail: any) => {
        if (detail.subtitle) children.push(createSubTitle(detail.subtitle, borderColor === '6366F1' ? '1E293B' : borderColor));
        children.push(...parseContentToParagraphs(detail.content));
      });
    }
    sections.push({
      properties: {
        page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({ children: [new TextRun({ text: 'VIP 프리미엄 전략 보고서', size: 16, color: '94A3B8', font: 'Malgun Gothic' })], alignment: AlignmentType.RIGHT })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'VIP 프리미엄 전략 보고서 | ', size: 16, color: '94A3B8', font: 'Malgun Gothic' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8', font: 'Malgun Gothic' }),
              new TextRun({ text: ' / ', size: 16, color: '94A3B8', font: 'Malgun Gothic' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8', font: 'Malgun Gothic' }),
            ],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children,
    });
  };

  // --- 00. Natal Chart Analysis ---
  const natalChildren: any[] = [createSectionTitle(parsedContent?.natalChartAnalysis?.title || '00. 사주원국(四柱原局) 심층 분석')];
  
  // Day Master info
  const dm = sajuData?.userSaju?.dayMaster;
  if (dm) {
    natalChildren.push(new Paragraph({
      children: [new TextRun({ text: `본신의 본질: ${dm.chinese} ${dm.korean} (日干)`, bold: true, size: 26, color: '854D0E', font: 'Malgun Gothic' })],
      spacing: { before: 200, after: 100 },
      shading: { type: ShadingType.SOLID, color: 'FEFCE8' },
    }));
    natalChildren.push(new Paragraph({
      children: [new TextRun({ text: dm.description, size: 22, color: '92400E', font: 'Malgun Gothic' })],
      spacing: { after: 200 },
    }));
  }
  
  // Saju table
  const sajuTable = createSajuTable(sajuData?.userSaju);
  if (sajuTable) natalChildren.push(sajuTable);
  natalChildren.push(new Paragraph({ spacing: { after: 200 } }));

  // Five elements
  const elRatio = sajuData?.userSaju?.elementRatio;
  if (elRatio) {
    const elemNames: Record<string, string> = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
    natalChildren.push(createSubTitle('오행(五行) 에너지 분포'));
    Object.entries(elemNames).forEach(([key, label]) => {
      const val = elRatio[key] || 0;
      natalChildren.push(new Paragraph({
        children: [new TextRun({ text: `${label}: ${val}%`, size: 22, font: 'Malgun Gothic', bold: val > 30 })],
        spacing: { after: 60 },
        indent: { left: 400 },
      }));
    });
    natalChildren.push(new Paragraph({ spacing: { after: 200 } }));
  }

  // Natal chart details
  parsedContent?.natalChartAnalysis?.details?.forEach((detail: any) => {
    if (detail.subtitle) natalChildren.push(createSubTitle(detail.subtitle));
    natalChildren.push(...parseContentToParagraphs(detail.content));
  });

  sections.push({
    properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
    children: natalChildren,
  });

  // --- 01~03 Standard sections ---
  addSection(parsedContent?.coreIdentity?.title || '01. 선천적 기질 및 운명적 본질', parsedContent?.coreIdentity?.details);
  addSection(parsedContent?.wealthAndCareer?.title || '02. 재물 그릇의 크기와 사회적 성취', parsedContent?.wealthAndCareer?.details, '0369A1');
  addSection(parsedContent?.relationship?.title || '03. 인연의 지형도와 감정의 흐름', parsedContent?.relationship?.details, 'BE185D');

  // --- 04. Yearly Roadmap ---
  if (parsedContent?.threeYearRoadmap?.details) {
    const roadmapChildren: any[] = [createSectionTitle(parsedContent.threeYearRoadmap.title || '04. 핵심 4개년 냉철한 심층 분석')];
    parsedContent.threeYearRoadmap.details.forEach((yearData: any) => {
      roadmapChildren.push(new Paragraph({
        children: [new TextRun({ text: `${yearData.year}년: ${yearData.yearlyTheme}`, bold: true, size: 28, color: '4338CA', font: 'Malgun Gothic' })],
        spacing: { before: 400, after: 200 },
      }));
      yearData.subtopics?.forEach((subtopic: any) => {
        if (subtopic.subtitle) roadmapChildren.push(createSubTitle(subtopic.subtitle));
        roadmapChildren.push(...parseContentToParagraphs(subtopic.content));
      });
    });
    sections.push({
      properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      children: roadmapChildren,
    });
  }

  // --- 05. Special Request Analysis ---
  addSection(parsedContent?.specialRequestAnalysis?.title || '05. 내담자 특별 요청사항에 대한 명리적 해답', parsedContent?.specialRequestAnalysis?.details, '4F46E5');

  // --- 06. Action Plan ---
  addSection(parsedContent?.actionPlan?.title || '06. 운명을 바꾸는 마스터의 마스터플랜', parsedContent?.actionPlan?.details, '1E293B');

  // Build and download
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Malgun Gothic', size: 22 },
        },
      },
    },
    sections,
  });

  const blob = await Packer.toBlob(doc);
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `프리미엄_심층리포트_${clientName}_${date}.docx`);
}
