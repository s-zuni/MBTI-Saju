import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register Fonts (Using public CDN for fonts that support Korean)
Font.register({
  family: 'NanumMyeongjo',
  src: 'https://fonts.gstatic.com/s/nanummyeongjo/v21/6NUK8T6_o_yCpgicSm6_67VpPZ_T_nAtYySj.ttf',
  fontWeight: 'normal',
});
Font.register({
  family: 'NanumMyeongjoBold',
  src: 'https://fonts.gstatic.com/s/nanummyeongjo/v21/6NUK8T6_o_yCpgicSm6_67VpPZ_T_nAtYySj.ttf', 
  fontWeight: 'bold',
});
Font.register({
  family: 'NanumGothic',
  src: 'https://fonts.gstatic.com/s/nanumgothic/v21/PN_oR7K9072Z7pD-Z-p3_OAt-B374H6O.ttf',
});

const styles = StyleSheet.create({
  page: {
    padding: '20mm',
    backgroundColor: '#ffffff',
    fontFamily: 'NanumGothic',
    fontSize: 11,
    lineHeight: 1.6,
    color: '#334155',
  },
  coverPage: {
    padding: 0,
    backgroundColor: '#0F172A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
  },
  coverTitle: {
    fontFamily: 'NanumMyeongjo',
    fontSize: 42,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -1,
  },
  coverSubtitle: {
    fontSize: 12,
    letterSpacing: 8,
    color: '#FBBF24',
    marginBottom: 40,
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 28,
    fontFamily: 'NanumMyeongjo',
    marginTop: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'NanumMyeongjo',
    fontSize: 22,
    color: '#0F172A',
    borderBottom: '1pt solid #E2E8F0',
    paddingBottom: 8,
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 15,
    marginBottom: 10,
    borderLeft: '3pt solid #6366F1',
    paddingLeft: 8,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 10,
  },
  bullet: {
    width: 10,
    fontSize: 12,
  },
  bulletText: {
    flex: 1,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#1E293B',
    color: '#ffffff',
    padding: 5,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    textAlign: 'center',
  },
  labelCell: {
    fontSize: 8,
    color: '#94A3B8',
    marginBottom: 2,
  },
  mainChar: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subChar: {
    fontSize: 10,
    color: '#64748B',
  },
  footer: {
    position: 'absolute',
    bottom: '10mm',
    left: '20mm',
    right: '20mm',
    borderTop: '0.5pt solid #E2E8F0',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94A3B8',
  }
});

interface PillarInfo {
  gan?: string;
  zhi?: string;
  ganShiShen?: string;
  zhiShiShen?: string;
  twelveStages?: string;
}

interface Props {
  sajuData: {
    userSaju?: {
      pillars?: {
        year?: PillarInfo;
        month?: PillarInfo;
        day?: PillarInfo;
        hour?: PillarInfo;
      };
      elementRatio?: Record<string, number>;
    };
    reportType?: string;
  };
  parsedContent: any;
  clientName: string;
}

const ELEMENT_COLORS = {
  wood: '#059669', fire: '#E11D48', earth: '#B45309', metal: '#475569', water: '#2563EB',
};

const getElementColor = (char: string | undefined | null): string => {
  if (!char || char === '-') return '#334155';
  
  const target: string = char!; // Force non-null
  
  const wood = ['甲', '乙', '寅', '卯'];
  const fire = ['丙', '丁', '巳', '午'];
  const earth = ['戊', '己', '辰', '戌', '丑', '未'];
  const metal = ['庚', '辛', '申', '酉'];
  const water = ['壬', '癸', '亥', '子'];

  for (const c of wood) if (c === target) return ELEMENT_COLORS.wood;
  for (const c of fire) if (c === target) return ELEMENT_COLORS.fire;
  for (const c of earth) if (c === target) return ELEMENT_COLORS.earth;
  for (const c of metal) if (c === target) return ELEMENT_COLORS.metal;
  for (const c of water) if (c === target) return ELEMENT_COLORS.water;
  
  return '#334155';
};

const cleanText = (text: string | undefined) => {
  if (!text) return '';
  return text.replace(/\(.*?이상\)\s*/g, '').trim();
};

const renderContent = (text: string | undefined) => {
  const content = cleanText(text);
  if (!content) return null;

  const sections = content.split('\n');
  return sections.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <View key={idx} style={{ height: 10 }} />;

    if (trimmed.startsWith('▶')) {
      return (
        <Text key={idx} style={styles.subTitle} wrap={false}>
          {trimmed.replace('▶', '').trim()}
        </Text>
      );
    }

    if (trimmed.startsWith('- ')) {
      return (
        <View key={idx} style={styles.bulletPoint} wrap={false}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{trimmed.slice(2)}</Text>
        </View>
      );
    }

    return (
      <Text key={idx} style={styles.paragraph}>
        {trimmed}
      </Text>
    );
  });
};

export const DeepReportReactPDF: React.FC<Props> = ({ sajuData, parsedContent, clientName }) => {
  const pillars = sajuData?.userSaju?.pillars;
  const pList = [pillars?.hour, pillars?.day, pillars?.month, pillars?.year];
  const pLabels = ['시주 (時柱)', '일주 (일柱)', '월주 (月柱)', '년주 (年柱)'];

  return (
    <Document>
      <Page size="A4" style={styles.coverPage}>
        <View style={{ width: 40, height: 1, backgroundColor: '#FBBF24', marginBottom: 30, opacity: 0.5 }} />
        <Text style={styles.coverSubtitle}>심층 분석 리포트</Text>
        <Text style={styles.coverTitle}>심층 전략 분석{'\n'}프리미엄 에디션</Text>
        <View style={{ height: 1, width: 150, backgroundColor: '#334155', marginBottom: 30 }} />
        <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 10 }}>특별히 준비된</Text>
        <Text style={styles.clientName}>{clientName} 님</Text>
        <Text style={{ marginTop: 20, fontSize: 10, color: '#64748B', letterSpacing: 2 }}>
          {sajuData?.reportType || '사주 명리학 심층 분석'}
        </Text>
        <Text style={{ position: 'absolute', bottom: 40, fontSize: 8, color: '#475569' }}>
          © 2025 MBTI-사주 시너지. ALL RIGHTS RESERVED.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.sectionTitle}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#F1F5F9', marginRight: 10 }}>01</Text>
          <Text style={{ flex: 1 }}>선천적 기질 및 행운의 요소</Text>
        </View>
        <View style={{ backgroundColor: '#F8FAFC', padding: 15, borderRadius: 10, marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#1E293B' }}>사주 원국 상세 분석</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              {pLabels.map((l, i) => <Text key={i} style={styles.tableColHeader}>{l}</Text>)}
            </View>
            <View style={styles.tableRow}>
              {pList.map((p, i) => (
                <View key={i} style={styles.tableCol}>
                  <Text style={styles.labelCell}>천간</Text>
                  <Text style={[styles.mainChar, { color: getElementColor(p?.gan) as any }]}>{p?.gan || '-'}</Text>
                  <Text style={styles.subChar}>{p?.ganShiShen || '-'}</Text>
                </View>
              ))}
            </View>
            <View style={styles.tableRow}>
              {pList.map((p, i) => (
                <View key={i} style={styles.tableCol}>
                  <Text style={styles.labelCell}>지지</Text>
                  <Text style={[styles.mainChar, { color: getElementColor(p?.zhi) as any }]}>{p?.zhi || '-'}</Text>
                  <Text style={styles.subChar}>{p?.zhiShiShen || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        {renderContent(parsedContent.congenitalSummary)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#F1F5F9', marginRight: 10 }}>02</Text><Text style={{ flex: 1 }}>재물적 성취 및 직업 전략</Text></View>
        {renderContent(parsedContent.wealthAnalysis)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#F1F5F9', marginRight: 10 }}>03</Text><Text style={{ flex: 1 }}>사회적 관계 및 대인 역학</Text></View>
        {renderContent(parsedContent.relationshipAnalysis)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#F1F5F9', marginRight: 10 }}>04</Text><Text style={{ flex: 1 }}>생체 리듬 및 건강 최적화</Text></View>
        {renderContent(parsedContent.healthAnalysis)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#F1F5F9', marginRight: 10 }}>05</Text><Text style={{ flex: 1 }}>향후 3년의 대운 흐름 (2027-2029)</Text></View>
        {renderContent(parsedContent.macroDecadeTrend)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#F1F5F9', marginRight: 10 }}>06</Text><Text style={{ flex: 1 }}>맞춤 파트너 및 피해야 할 유형 분석</Text></View>
        {renderContent(parsedContent.partnerAnalysis)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#F1F5F9', marginRight: 10 }}>07</Text><Text style={{ flex: 1 }}>리스크 관리 및 방어 전략</Text></View>
        {renderContent(parsedContent.riskAnalysis)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#F1F5F9', marginRight: 10 }}>08</Text><Text style={{ flex: 1 }}>삶의 근본적 과업과 사명</Text></View>
        {renderContent(parsedContent.coreLifeMission)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#F1F5F9', marginRight: 10 }}>09</Text><Text style={{ flex: 1 }}>마스터 핵심 지침</Text></View>
        {renderContent(parsedContent.strategicDirective)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>
    </Document>
  );
};
