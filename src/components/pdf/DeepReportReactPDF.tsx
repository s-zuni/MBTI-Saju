import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, Circle, Line } from '@react-pdf/renderer';

const FONT_BASE_URL = 'https://www.mbtiju.com';

Font.register({
  family: 'NanumMyungjo',
  fonts: [
    { src: `${FONT_BASE_URL}/fonts/NanumMyeongjo-Regular.ttf`, fontWeight: 400 },
    { src: `${FONT_BASE_URL}/fonts/NanumMyeongjo-Bold.ttf`, fontWeight: 700 },
    { src: `${FONT_BASE_URL}/fonts/NanumMyeongjo-Regular.ttf`, fontWeight: 400, fontStyle: 'italic' },
    { src: `${FONT_BASE_URL}/fonts/NanumMyeongjo-Bold.ttf`, fontWeight: 700, fontStyle: 'italic' }
  ]
});

Font.register({
  family: 'NotoSansKR',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLQ.ttf' },
    { src: 'https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzg01eLQ.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: '25mm',
    backgroundColor: '#ffffff',
    fontFamily: 'NotoSansKR',
    fontSize: 12,
    lineHeight: 1.8,
    color: '#1E293B',
  },
  coverPage: {
    padding: 0,
    backgroundColor: '#0F172A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontFamily: 'NotoSansKR',
  },
  coverTitle: {
    fontFamily: 'NanumMyungjo',
    fontSize: 48,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 14,
    letterSpacing: 10,
    color: '#FBBF24',
    marginBottom: 48,
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 32,
    fontFamily: 'NanumMyungjo',
    marginTop: 24,
    color: '#F8FAFC',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontFamily: 'NanumMyungjo',
    fontSize: 26,
    color: '#0F172A',
    borderBottom: '2pt solid #E2E8F0',
    paddingBottom: 12,
    marginBottom: 30,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 25,
    marginBottom: 15,
    borderLeft: '4pt solid #6366F1',
    paddingLeft: 12,
    fontFamily: 'NotoSansKR',
  },
  paragraph: {
    marginBottom: 15,
    textAlign: 'justify',
    fontFamily: 'NotoSansKR',
    color: '#334155',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 15,
  },
  bullet: {
    width: 15,
    fontSize: 14,
    color: '#6366F1',
    fontFamily: 'NotoSansKR',
  },
  bulletText: {
    flex: 1,
    fontFamily: 'NotoSansKR',
    fontSize: 11.5,
  },
  adviceBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    border: '1pt solid #C7D2FE',
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4338CA',
    marginBottom: 8,
    fontFamily: 'NotoSansKR',
  },
  adviceContent: {
    fontSize: 12,
    fontFamily: 'NanumMyungjo',
    color: '#312E81',
    fontStyle: 'italic',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 60,
    color: '#F1F5F9',
    opacity: 0.3,
    zIndex: -1,
    fontFamily: 'NotoSansKR',
  },
  footer: {
    position: 'absolute',
    bottom: '10mm',
    left: '25mm',
    right: '25mm',
    borderTop: '0.5pt solid #E2E8F0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#94A3B8',
    fontFamily: 'NotoSansKR',
  },
  legalPage: {
    padding: '40mm 25mm',
    backgroundColor: '#F8FAFC',
    color: '#64748B',
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 2,
  },
  radarContainer: {
    marginVertical: 30,
    padding: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    border: '1pt solid #E2E8F0',
    alignItems: 'center',
  }
});

interface PillarInfo {
  gan?: string;
  zhi?: string;
  ganShiShen?: string;
  zhiShiShen?: string;
  twelveStages?: string;
  twelveSpirits?: string;
  hiddenStems?: string[];
}

interface Props {
  sajuData: {
    userSaju?: {
      dayMaster?: {
        chinese: string;
        korean: string;
        description: string;
      };
      elementRatio?: {
        wood: number;
        fire: number;
        earth: number;
        metal: number;
        water: number;
      };
      pillars?: {
        year?: PillarInfo;
        month?: PillarInfo;
        day?: PillarInfo;
        hour?: PillarInfo;
      };
    };
    reportType?: string;
  };
  parsedContent: any;
  clientName: string;
}

const ELEMENT_COLORS = {
  wood: '#10B981', fire: '#EF4444', earth: '#F59E0B', metal: '#64748B', water: '#3B82F6',
};






const renderContent = (text: string | undefined) => {
  if (!text) return null;
  const sections = text.split('\n');
  return sections.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <View key={idx} style={{ height: 12 }} />;
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
          <Text style={styles.bullet}>■</Text>
          <Text style={styles.bulletText}>{trimmed.slice(2)}</Text>
        </View>
      );
    }
    return <Text key={idx} style={styles.paragraph}>{trimmed}</Text>;
  });
};

const RadarChart: React.FC<{ ratio: any }> = ({ ratio }) => {
  if (!ratio) return null;
  const size = 300;
  const center = size / 2;
  const radius = 100;
  const categories = [
    { label: '목(木)', key: 'wood', angle: -90, color: ELEMENT_COLORS.wood },
    { label: '화(火)', key: 'fire', angle: -18, color: ELEMENT_COLORS.fire },
    { label: '토(土)', key: 'earth', angle: 54, color: ELEMENT_COLORS.earth },
    { label: '금(金)', key: 'metal', angle: 126, color: ELEMENT_COLORS.metal },
    { label: '수(水)', key: 'water', angle: 198, color: ELEMENT_COLORS.water },
  ];
  const points = categories.map(c => {
    const val = (ratio[c.key] || 0) / 100;
    const r = radius * val;
    const rad = (c.angle * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  });
  const pathData = points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '') + ' Z';
  return (
    <View style={styles.radarContainer}>
      <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 20, fontFamily: 'NotoSansKR' }}>오행(五行) 에너지 밸런스</Text>
      <Svg width={size} height={size}>
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((v, i) => (
          <Circle key={i} cx={center} cy={center} r={radius * v} stroke="#E2E8F0" strokeWidth={0.5} fill="none" />
        ))}
        {categories.map((c, i) => {
          const rad = (c.angle * Math.PI) / 180;
          return (
            <React.Fragment key={i}>
              <Line x1={center} y1={center} x2={center + radius * Math.cos(rad)} y2={center + radius * Math.sin(rad)} stroke="#E2E8F0" strokeWidth={0.5} />
              <Text x={center + (radius + 20) * Math.cos(rad)} y={center + (radius + 20) * Math.sin(rad)} style={{ fontSize: 10, fill: c.color, fontFamily: 'NotoSansKR', textAnchor: 'middle' }}>{c.label}</Text>
            </React.Fragment>
          );
        })}
        <Path d={pathData} fill="#6366F1" fillOpacity={0.2} stroke="#6366F1" strokeWidth={2} />
      </Svg>
    </View>
  );
};

const ThreeYearTimeline: React.FC<{ detail: any[] }> = ({ detail }) => {
  if (!detail) return null;
  return detail.map((yearData, idx) => (
    <Page key={idx} size="A4" style={styles.page}>
      <Text style={styles.watermark} fixed>MBTI-SAJU SYNERGY</Text>
      <View style={styles.sectionTitle}>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6366F1', marginRight: 15 }}>{yearData.year}</Text>
        <Text style={{ flex: 1 }}>{yearData.year}년 상세 운세 로드맵</Text>
      </View>
      <Text style={[styles.paragraph, { fontSize: 13, fontWeight: 'bold', color: '#1E293B' }]}>{yearData.summary}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 15 }}>
        {yearData.keywords?.map((k: string, i: number) => (
          <Text key={i} style={{ backgroundColor: '#F1F5F9', padding: '4 10', borderRadius: 20, fontSize: 10, color: '#475569' }}>#{k}</Text>
        ))}
      </View>
      <View style={{ marginTop: 20 }}>
        {Object.entries(yearData.areas || {}).map(([key, val]: any, i) => (
          <View key={i} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#4338CA', marginBottom: 5 }}>[ {key.toUpperCase()} ]</Text>
            <Text style={styles.paragraph}>{val}</Text>
          </View>
        ))}
      </View>
      <View style={styles.adviceBox}>
        <Text style={styles.adviceTitle}>마스터의 핵심 개운 행동 (Golden Action)</Text>
        <Text style={styles.adviceContent}>{yearData.goldenAction}</Text>
      </View>
      <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT | {yearData.year} YEARLY DETAIL</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
    </Page>
  ));
};

export const DeepReportReactPDF: React.FC<Props> = ({ sajuData, parsedContent, clientName }) => {
  return (
    <Document>
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverSubtitle}>PREMIUM SYNERGY REPORT</Text>
        <Text style={styles.coverTitle}>심층 인생 전략 분석{'\n'}마스터 에디션</Text>
        <View style={{ height: 2, width: 200, backgroundColor: '#FBBF24', marginVertical: 40 }} />
        <Text style={{ fontSize: 14, color: '#94A3B8', marginBottom: 15 }}>귀하를 위한 운명의 기록</Text>
        <Text style={styles.clientName}>{clientName} 님</Text>
        <Text style={{ marginTop: 60, fontSize: 12, color: '#475569', letterSpacing: 3 }}>
          {sajuData?.reportType || '사주 명리학 심층 분석'}
        </Text>
        <Text style={{ position: 'absolute', bottom: 50, fontSize: 10, color: '#64748B' }}>
          © 2026 MBTI-사주 시너지 연구소. ALL RIGHTS RESERVED.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>MBTI-SAJU SYNERGY</Text>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6366F1', marginRight: 15 }}>01</Text><Text style={{ flex: 1 }}>선천적 기질 및 운명적 도구</Text></View>
        <RadarChart ratio={sajuData?.userSaju?.elementRatio} />
        {renderContent(parsedContent.congenitalSummary)}
        <View style={styles.adviceBox}>
          <Text style={styles.adviceTitle}>마스터의 기질 총평</Text>
          <Text style={styles.adviceContent}>{parsedContent.masterAdvice}</Text>
        </View>
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT | CORE ESSENCE</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>MBTI-SAJU SYNERGY</Text>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6366F1', marginRight: 15 }}>02</Text><Text style={{ flex: 1 }}>재물적 성취 및 사회적 성공 전략</Text></View>
        {renderContent(parsedContent.wealthAnalysis)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT | WEALTH & CAREER</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>MBTI-SAJU SYNERGY</Text>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6366F1', marginRight: 15 }}>03</Text><Text style={{ flex: 1 }}>사회적 관계 및 인간 역학</Text></View>
        {renderContent(parsedContent.relationshipAnalysis)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT | RELATIONSHIPS</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>MBTI-SAJU SYNERGY</Text>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6366F1', marginRight: 15 }}>04</Text><Text style={{ flex: 1 }}>에너지 리듬 및 생체 건강</Text></View>
        {renderContent(parsedContent.healthAnalysis)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT | HEALTH & VITALITY</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <ThreeYearTimeline detail={parsedContent.threeYearDetail} />

      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>MBTI-SAJU SYNERGY</Text>
        <View style={styles.sectionTitle}><Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6366F1', marginRight: 15 }}>09</Text><Text style={{ flex: 1 }}>인생 사명 및 마스터 가이드</Text></View>
        {renderContent(parsedContent.strategicDirective)}
        <View style={styles.footer} fixed><Text>PREMIUM DEEP REPORT | STRATEGIC DIRECTIVE</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      <Page size="A4" style={styles.legalPage}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 40 }}>법적 고지 및 안내</Text>
        <Text>본 리포트는 명리학적 데이터와 심리 분석을 바탕으로 한 통계적 분석 결과이며, 개인의 자유 의지와 환경에 따라 실제 삶과는 다를 수 있습니다. 인생의 참고 자료로 활용하시기 바랍니다. 모든 분석 내용은 학술적 견해를 포함하고 있으며, 특정 미래 사건에 대한 확정적 예고가 아님을 밝힙니다.</Text>
        <Text style={{ marginTop: 60 }}>MBTI-사주 시너지 전략 연구소</Text>
      </Page>
    </Document>
  );
};
