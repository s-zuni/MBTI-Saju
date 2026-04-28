import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import NanumMyeongjoRegular from '../../assets/fonts/NanumMyeongjo-Regular.ttf';
import NanumMyeongjoBold from '../../assets/fonts/NanumMyeongjo-Bold.ttf';

// Font Registration
Font.register({
  family: 'NanumMyungjo',
  fonts: [
    { src: NanumMyeongjoRegular, fontWeight: 400 },
    { src: NanumMyeongjoBold, fontWeight: 700 },
    { src: NanumMyeongjoRegular, fontWeight: 400, fontStyle: 'italic' },
    { src: NanumMyeongjoBold, fontWeight: 700, fontStyle: 'italic' }
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
    padding: '20mm',
    backgroundColor: '#ffffff',
    fontFamily: 'NotoSansKR',
    fontSize: 11,
    lineHeight: 1.6,
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
    fontSize: 32,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 1.3,
    paddingHorizontal: 40,
  },
  coverSubtitle: {
    fontSize: 10,
    letterSpacing: 6,
    color: '#FBBF24',
    marginBottom: 40,
    fontWeight: 'bold',
  },
  clientName: {
    fontSize: 24,
    fontFamily: 'NanumMyungjo',
    marginTop: 20,
    color: '#F8FAFC',
  },
  sectionTitle: {
    fontFamily: 'NanumMyungjo',
    fontSize: 20,
    color: '#0F172A',
    borderBottom: '1pt solid #E2E8F0',
    paddingBottom: 8,
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 15,
    marginBottom: 8,
    borderLeft: '3pt solid #6366F1',
    paddingLeft: 10,
    fontFamily: 'NotoSansKR',
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
    fontFamily: 'NotoSansKR',
    color: '#334155',
    fontSize: 10.5,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 10,
  },
  bullet: {
    width: 10,
    fontSize: 10,
    color: '#6366F1',
    fontFamily: 'NotoSansKR',
  },
  bulletText: {
    flex: 1,
    fontFamily: 'NotoSansKR',
    fontSize: 10,
  },
  box: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    border: '0.5pt solid #E2E8F0',
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4338CA',
    marginBottom: 6,
    fontFamily: 'NotoSansKR',
  },
  footer: {
    position: 'absolute',
    bottom: '10mm',
    left: '20mm',
    right: '20mm',
    borderTop: '0.5pt solid #E2E8F0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94A3B8',
    fontFamily: 'NotoSansKR',
  },
  sajuTable: {
    flexDirection: 'row',
    marginBottom: 15,
    border: '0.5pt solid #E2E8F0',
  },
  sajuCol: {
    flex: 1,
    borderRight: '0.5pt solid #E2E8F0',
  },
  sajuHeader: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 4,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: 'bold',
  },
  sajuCell: {
    padding: 6,
    textAlign: 'center',
    borderBottom: '0.5pt solid #E2E8F0',
  },
  sajuLabel: {
    fontSize: 6,
    color: '#94A3B8',
    marginBottom: 1,
  },
  sajuValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

interface Props {
  sajuData: any;
  parsedContent: any;
  clientName: string;
}

const renderText = (text: string | undefined) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <View key={idx} style={{ height: 6 }} />;
    if (trimmed.startsWith('- ')) {
      return (
        <View key={idx} style={styles.bulletPoint}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{trimmed.slice(2)}</Text>
        </View>
      );
    }
    return <Text key={idx} style={styles.paragraph}>{trimmed}</Text>;
  });
};

const SajuTable: React.FC<{ saju: any }> = ({ saju }) => {
  if (!saju?.pillars) return null;
  const pillars = [saju.pillars.hour, saju.pillars.day, saju.pillars.month, saju.pillars.year];
  const headers = ['시주(時柱)', '일주(日柱)', '월주(月柱)', '년주(年柱)'];

  return (
    <View style={styles.sajuTable}>
      {pillars.map((p, i) => (
        <View key={i} style={[styles.sajuCol, i === 3 ? { borderRight: 0 } : {}]}>
          <View style={styles.sajuHeader}><Text>{headers[i]}</Text></View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>천간(天干)</Text>
            <Text style={styles.sajuValue}>{p?.gan || '-'}</Text>
          </View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>지지(地支)</Text>
            <Text style={styles.sajuValue}>{p?.zhi || '-'}</Text>
          </View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>십성(十星)</Text>
            <Text style={{ fontSize: 8 }}>{p?.zhiShiShen || '-'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export const DeepReportReactPDF: React.FC<Props> = ({ sajuData, parsedContent, clientName }) => {
  return (
    <Document>
      {/* 00. Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverSubtitle}>VIP 프리미엄 전략 보고서</Text>
        <Text style={styles.coverTitle}>{parsedContent.cover?.mainTitle || `${clientName} 님 심층 리포트`}</Text>
        <View style={{ height: 1, width: 100, backgroundColor: '#FBBF24', marginVertical: 20 }} />
        <Text style={styles.clientName}>{clientName} 님</Text>
        <Text style={{ marginTop: 30, fontSize: 11, color: '#94A3B8', textAlign: 'center', width: '70%' }}>
          {parsedContent.cover?.subTitle || "명리학과 심리학의 융합을 통한 인생 설계"}
        </Text>
        <Text style={{ marginTop: 80, fontSize: 9, color: '#475569' }}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </Page>

      {/* 01. Core Identity */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.coreIdentity?.title || "01. 선천적 기질 및 운명적 본질"}</Text>
        
        <View style={{ marginBottom: 15 }}>
          <Text style={[styles.subTitle, { borderLeftColor: '#FBBF24' }]}>사주 원국 분석 (四柱 元局)</Text>
          <SajuTable saju={sajuData?.userSaju} />
        </View>

        <Text style={styles.subTitle}>기질적 시너지 분석</Text>
        {renderText(parsedContent.coreIdentity?.mbtiSajuSynergy)}
        
        <View style={[styles.box, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', marginTop: 20 }]}>
          <Text style={[styles.boxTitle, { color: '#BE123C' }]}>잠재적 리스크 관리 (위험 요소 대비)</Text>
          {renderText(parsedContent.coreIdentity?.hiddenRisk)}
        </View>
        
        <View style={styles.footer} fixed>
          <Text>VIP 프리미엄 전략 보고서 | 핵심 기질 분석</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* 02. Wealth & Career */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.wealthAndCareer?.title || "02. 재물 그릇의 크기와 사회적 성취"}</Text>
        
        <Text style={styles.subTitle}>재물 축적 방식 및 자산 관리 전략</Text>
        {renderText(parsedContent.wealthAndCareer?.wealthFlow)}
        
        <View style={[styles.box, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', marginTop: 20 }]}>
          <Text style={[styles.boxTitle, { color: '#0369A1' }]}>최적의 직업적 환경과 포지셔닝</Text>
          {renderText(parsedContent.wealthAndCareer?.careerDirection)}
        </View>
        
        <View style={styles.footer} fixed>
          <Text>VIP 프리미엄 전략 보고서 | 재물 및 직업운</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* 03. Relationship */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.relationship?.title || "03. 인연의 지형도와 감정의 흐름"}</Text>
        
        <Text style={styles.subTitle}>대인관계 역학 및 귀인 활용법</Text>
        {renderText(parsedContent.relationship?.socialNetwork)}
        
        <View style={[styles.box, { backgroundColor: '#FDF2F8', borderColor: '#FBCFE8', marginTop: 20 }]}>
          <Text style={[styles.boxTitle, { color: '#BE185D' }]}>감정의 패턴과 최적의 파트너십</Text>
          {renderText(parsedContent.relationship?.romance)}
        </View>
        
        <View style={styles.footer} fixed>
          <Text>VIP 프리미엄 전략 보고서 | 대인관계 및 인연</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* 04. Future Roadmap (Array based from AI) */}
      {parsedContent.threeYearRoadmap?.details?.map((yearData: any, index: number) => (
        <Page key={yearData.year || index} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{index === 0 ? (parsedContent.threeYearRoadmap?.title || "04. 미래 운명적 로드맵") : `${yearData.year}년 심층 분석`}</Text>
          
          <Text style={[styles.subTitle, { color: '#4338CA' }]}>{yearData.year}년: {yearData.yearlyTheme}</Text>
          
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 4 }}>[연간 총평 및 거시적 흐름]</Text>
            {renderText(yearData.overallSummary)}
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 9, color: '#4338CA', marginBottom: 2 }}>[재물 및 직업적 성취]</Text>
            {renderText(yearData.careerAndWealthDetails)}
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 9, color: '#BE185D', marginBottom: 2 }}>[대인관계 및 애정 흐름]</Text>
            {renderText(yearData.relationshipDetails)}
          </View>

          <View style={[styles.box, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', marginTop: 10 }]}>
            <Text style={[styles.boxTitle, { color: '#15803D' }]}>건강 관리 및 개운 전략</Text>
            {renderText(yearData.healthAndCaution)}
          </View>

          <View style={styles.footer} fixed>
            <Text>VIP 프리미엄 전략 보고서 | 미래 운세 분석</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}

      {/* 05. Action Plan */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.actionPlan?.title || "05. 운명을 바꾸는 마스터의 마스터플랜"}</Text>
        
        <View style={{ marginBottom: 15 }}>
          <Text style={styles.subTitle}>핵심 지침 01. 즉각적 실행 과제</Text>
          {renderText(parsedContent.actionPlan?.advice1)}
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text style={styles.subTitle}>핵심 지침 02. 운의 흐름 강화 전략</Text>
          {renderText(parsedContent.actionPlan?.advice2)}
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text style={styles.subTitle}>핵심 지침 03. 관계적 한계 돌파</Text>
          {renderText(parsedContent.actionPlan?.advice3)}
        </View>

        <View style={[styles.box, { backgroundColor: '#F8FAFC', borderLeftWidth: 4, borderLeftColor: '#1E293B', marginTop: 30 }]}>
          <Text style={[styles.boxTitle, { color: '#1E293B' }]}>마스터의 최종 제언</Text>
          <Text style={styles.paragraph}>
            본 보고서는 당신의 선천적 기질과 후천적 운의 흐름을 정밀하게 분석한 결과입니다. 
            위에서 제시한 현실적인 조언들을 생활 속에 적용하여, 타고난 운명을 넘어 당신이 원하는 최고의 성취를 이루시길 진심으로 기원합니다.
          </Text>
        </View>

        <View style={{ marginTop: 'auto', padding: 15, borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: '#94A3B8', textAlign: 'center' }}>
            본 리포트는 개인의 생년월일시와 MBTI 데이터를 기반으로 한 상담용 자료이며, 최종적인 삶의 결정은 본인의 의지에 달려 있습니다.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>VIP 프리미엄 전략 보고서 | 최종 마스터플랜</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
