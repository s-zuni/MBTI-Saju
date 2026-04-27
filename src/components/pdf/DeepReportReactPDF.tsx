import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, Circle, Line } from '@react-pdf/renderer';
import NanumMyeongjoRegular from '../../assets/fonts/NanumMyeongjo-Regular.ttf';
import NanumMyeongjoBold from '../../assets/fonts/NanumMyeongjo-Bold.ttf';

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
    fontSize: 40,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 1.2,
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
    fontFamily: 'NanumMyungjo',
    marginTop: 20,
    color: '#F8FAFC',
  },
  sectionTitle: {
    fontFamily: 'NanumMyungjo',
    fontSize: 22,
    color: '#0F172A',
    borderBottom: '1pt solid #E2E8F0',
    paddingBottom: 10,
    marginBottom: 25,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 10,
    borderLeft: '3pt solid #6366F1',
    paddingLeft: 10,
    fontFamily: 'NotoSansKR',
  },
  paragraph: {
    marginBottom: 12,
    textAlign: 'justify',
    fontFamily: 'NotoSansKR',
    color: '#334155',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 10,
  },
  bullet: {
    width: 12,
    fontSize: 12,
    color: '#6366F1',
    fontFamily: 'NotoSansKR',
  },
  bulletText: {
    flex: 1,
    fontFamily: 'NotoSansKR',
    fontSize: 10.5,
  },
  box: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    border: '0.5pt solid #E2E8F0',
  },
  boxTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4338CA',
    marginBottom: 8,
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
    marginBottom: 20,
    border: '0.5pt solid #E2E8F0',
  },
  sajuCol: {
    flex: 1,
    borderRight: '0.5pt solid #E2E8F0',
  },
  sajuHeader: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 5,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
  },
  sajuCell: {
    padding: 8,
    textAlign: 'center',
    borderBottom: '0.5pt solid #E2E8F0',
  },
  sajuLabel: {
    fontSize: 7,
    color: '#94A3B8',
    marginBottom: 2,
  },
  sajuValue: {
    fontSize: 14,
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
    if (!trimmed) return <View key={idx} style={{ height: 8 }} />;
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
  const headers = ['시주', '일주', '월주', '년주'];

  return (
    <View style={styles.sajuTable}>
      {pillars.map((p, i) => (
        <View key={i} style={[styles.sajuCol, i === 3 ? { borderRight: 0 } : {}]}>
          <View style={styles.sajuHeader}><Text>{headers[i]}</Text></View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>천간</Text>
            <Text style={styles.sajuValue}>{p?.gan || '-'}</Text>
          </View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>지지</Text>
            <Text style={styles.sajuValue}>{p?.zhi || '-'}</Text>
          </View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>십성</Text>
            <Text style={{ fontSize: 9 }}>{p?.zhiShiShen || '-'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export const DeepReportReactPDF: React.FC<Props> = ({ sajuData, parsedContent, clientName }) => {
  const roadmap = parsedContent.threeYearRoadmap || [];
  const TOTAL_PAGES = 5 + roadmap.length;

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverSubtitle}>VIP LIFE STRATEGY</Text>
        <Text style={styles.coverTitle}>{parsedContent.cover?.mainTitle || `${clientName} 님 심층 리포트`}</Text>
        <View style={{ height: 1, width: 150, backgroundColor: '#FBBF24', marginVertical: 30 }} />
        <Text style={styles.clientName}>{clientName} 님</Text>
        <Text style={{ marginTop: 40, fontSize: 12, color: '#94A3B8' }}>{parsedContent.cover?.subTitle}</Text>
      </Page>

      {/* 01 Core Identity */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.coreIdentity?.title || "01. 선천적 기질 및 본질"}</Text>
        <SajuTable saju={sajuData?.userSaju} />
        <Text style={styles.subTitle}>기질적 시너지 분석</Text>
        {renderText(parsedContent.coreIdentity?.mbtiSajuSynergy)}
        <View style={[styles.box, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
          <Text style={[styles.boxTitle, { color: '#BE123C' }]}>잠재적 리스크 관리</Text>
          {renderText(parsedContent.coreIdentity?.hiddenRisk)}
        </View>
        <View style={styles.footer} fixed><Text>VIP STRATEGY REPORT | CORE IDENTITY</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      {/* 02 Wealth & Career */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.wealthAndCareer?.title || "02. 재물 및 사회적 성취"}</Text>
        <Text style={styles.subTitle}>직업적 포지셔닝</Text>
        {renderText(parsedContent.wealthAndCareer?.careerDirection)}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>자산 관리 및 재물 흐름</Text>
          {renderText(parsedContent.wealthAndCareer?.wealthFlow)}
        </View>
        <View style={styles.footer} fixed><Text>VIP STRATEGY REPORT | WEALTH & CAREER</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      {/* 03 Relationship */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.relationship?.title || "03. 인연 및 감정의 흐름"}</Text>
        <Text style={styles.subTitle}>대인관계 및 귀인 활용</Text>
        {renderText(parsedContent.relationship?.socialNetwork)}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>애정 패턴 및 파트너십</Text>
          {renderText(parsedContent.relationship?.romance)}
        </View>
        <View style={styles.footer} fixed><Text>VIP STRATEGY REPORT | RELATIONSHIPS</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>

      {/* Roadmap Pages */}
      {roadmap.map((yearData: any, idx: number) => (
        <Page key={idx} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{yearData.year}년 미래 로드맵</Text>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#4338CA', marginBottom: 15 }}>{yearData.yearlyTheme}</Text>
          <Text style={styles.paragraph}>{yearData.overallSummary}</Text>
          
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1E293B', marginBottom: 5 }}>[재물 및 직업]</Text>
            <Text style={[styles.paragraph, { fontSize: 10 }]}>{yearData.careerAndWealthDetails}</Text>
            
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1E293B', marginBottom: 5 }}>[인연 및 애정]</Text>
            <Text style={[styles.paragraph, { fontSize: 10 }]}>{yearData.relationshipDetails}</Text>
            
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1E293B', marginBottom: 5 }}>[건강 및 주의점]</Text>
            <Text style={[styles.paragraph, { fontSize: 10 }]}>{yearData.healthAndCaution}</Text>
          </View>
          <View style={styles.footer} fixed><Text>VIP STRATEGY REPORT | {yearData.year} ROADMAP</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
        </Page>
      ))}

      {/* 04 Action Plan */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.actionPlan?.title || "04. 마스터 마스터플랜"}</Text>
        <View style={[styles.box, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
          <Text style={[styles.boxTitle, { color: '#0369A1' }]}>즉각적 실행 과제</Text>
          {renderText(parsedContent.actionPlan?.advice1)}
        </View>
        <View style={styles.box}>
          <Text style={styles.boxTitle}>운의 강화 전략</Text>
          {renderText(parsedContent.actionPlan?.advice2)}
        </View>
        <View style={styles.box}>
          <Text style={styles.boxTitle}>관계적 돌파구</Text>
          {renderText(parsedContent.actionPlan?.advice3)}
        </View>
        <View style={styles.footer} fixed><Text>VIP STRATEGY REPORT | FINAL PLAN</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>
    </Document>
  );
};
