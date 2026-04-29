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
    fontSize: 16.5,
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
    fontSize: 48,
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 1.3,
    paddingHorizontal: 40,
  },
  coverSubtitle: {
    fontSize: 15,
    letterSpacing: 6,
    color: '#FBBF24',
    marginBottom: 60,
    fontWeight: 'bold',
  },
  clientName: {
    fontSize: 36,
    fontFamily: 'NanumMyungjo',
    marginTop: 30,
    color: '#F8FAFC',
  },
  sectionTitle: {
    fontFamily: 'NanumMyungjo',
    fontSize: 30,
    color: '#0F172A',
    borderBottom: '1.5pt solid #E2E8F0',
    paddingBottom: 12,
    marginBottom: 30,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  subTitle: {
    fontSize: 22.5,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 25,
    marginBottom: 12,
    borderLeft: '4.5pt solid #6366F1',
    paddingLeft: 15,
    fontFamily: 'NotoSansKR',
  },
  paragraph: {
    marginBottom: 15,
    textAlign: 'justify',
    fontFamily: 'NotoSansKR',
    color: '#334155',
    fontSize: 15.75,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 9,
    paddingLeft: 15,
  },
  bullet: {
    width: 15,
    fontSize: 15,
    color: '#6366F1',
    fontFamily: 'NotoSansKR',
  },
  bulletText: {
    flex: 1,
    fontFamily: 'NotoSansKR',
    fontSize: 15,
  },
  box: {
    marginTop: 22,
    padding: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    border: '0.75pt solid #E2E8F0',
  },
  boxTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4338CA',
    marginBottom: 9,
    fontFamily: 'NotoSansKR',
  },
  footer: {
    position: 'absolute',
    bottom: '10mm',
    left: '20mm',
    right: '20mm',
    borderTop: '0.75pt solid #E2E8F0',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'NotoSansKR',
  },
  sajuTable: {
    flexDirection: 'row',
    marginBottom: 22,
    border: '0.75pt solid #E2E8F0',
  },
  sajuCol: {
    flex: 1,
    borderRight: '0.75pt solid #E2E8F0',
  },
  sajuHeader: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 6,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sajuCell: {
    padding: 9,
    textAlign: 'center',
    borderBottom: '0.75pt solid #E2E8F0',
  },
  sajuLabel: {
    fontSize: 9,
    color: '#94A3B8',
    marginBottom: 2,
  },
  sajuValue: {
    fontSize: 18,
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
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <View key={idx} style={{ height: 9 }} />;
    if (trimmed.startsWith("- ")) {
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
  const headers = ["시주(時柱)", "일주(日柱)", "월주(月柱)", "년주(年柱)"];

  return (
    <View style={styles.sajuTable}>
      {pillars.map((p, i) => (
        <View key={i} style={[styles.sajuCol, i === 3 ? { borderRight: 0 } : {}]}>
          <View style={styles.sajuHeader}><Text>{headers[i]}</Text></View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>천간(天干)</Text>
            <Text style={styles.sajuValue}>{p?.gan || "-"}</Text>
          </View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>지지(地支)</Text>
            <Text style={styles.sajuValue}>{p?.zhi || "-"}</Text>
          </View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>십성(十星)</Text>
            <Text style={{ fontSize: 12 }}>{p?.zhiShiShen || "-"}</Text>
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
        <View style={{ height: 1.5, width: 150, backgroundColor: '#FBBF24', marginVertical: 30 }} />
        <Text style={styles.clientName}>{clientName} 님</Text>
        <Text style={{ marginTop: 45, fontSize: 16.5, color: '#94A3B8', textAlign: 'center', width: '70%' }}>
          {parsedContent.cover?.subTitle || "명리학과 심리학의 융합을 통한 인생 설계"}
        </Text>
        <Text style={{ marginTop: 120, fontSize: 13.5, color: '#475569' }}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </Page>

      {/* 00. Natal Chart Analysis */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.natalChartAnalysis?.title || "00. 사주원국(四柱原局) 심층 분석"}</Text>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.subTitle, { borderLeftColor: '#FBBF24' }]}>사주 원국 테이블 (四柱 元局)</Text>
          <SajuTable saju={sajuData?.userSaju} />
        </View>

        {parsedContent.natalChartAnalysis?.details?.map((detail: any, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }} wrap={false}>
            <Text style={styles.subTitle}>{detail.subtitle}</Text>
            {renderText(detail.content)}
          </View>
        ))}
        
        <View style={styles.footer} fixed>
          <Text>VIP 프리미엄 전략 보고서 | 사주원국 분석</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* 01. Core Identity */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.coreIdentity?.title || "01. 선천적 기질 및 운명적 본질"}</Text>

        {parsedContent.coreIdentity?.details?.map((detail: any, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }} wrap={false}>
            <Text style={styles.subTitle}>{detail.subtitle}</Text>
            {renderText(detail.content)}
          </View>
        ))}
        
        <View style={styles.footer} fixed>
          <Text>VIP 프리미엄 전략 보고서 | 핵심 기질 분석</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* 02. Wealth & Career */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.wealthAndCareer?.title || "02. 재물 그릇의 크기와 사회적 성취"}</Text>
        
        {parsedContent.wealthAndCareer?.details?.map((detail: any, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }} wrap={false}>
            <Text style={[styles.subTitle, { borderLeftColor: '#0369A1' }]}>{detail.subtitle}</Text>
            {renderText(detail.content)}
          </View>
        ))}
        
        <View style={styles.footer} fixed>
          <Text>VIP 프리미엄 전략 보고서 | 재물 및 직업운</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* 03. Relationship */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.relationship?.title || "03. 인연의 지형도와 감정의 흐름"}</Text>
        
        {parsedContent.relationship?.details?.map((detail: any, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }} wrap={false}>
            <Text style={[styles.subTitle, { borderLeftColor: '#BE185D' }]}>{detail.subtitle}</Text>
            {renderText(detail.content)}
          </View>
        ))}
        
        <View style={styles.footer} fixed>
          <Text>VIP 프리미엄 전략 보고서 | 대인관계 및 인연</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* 04. Future Roadmap */}
      {parsedContent.threeYearRoadmap?.details?.map((yearData: any, index: number) => (
        <Page key={yearData.year || index} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{index === 0 ? (parsedContent.threeYearRoadmap?.title || "04. 미래 운명적 로드맵") : `${yearData.year}년 심층 분석`}</Text>
          
          <Text style={[styles.subTitle, { color: '#4338CA' }]}>{yearData.year}년: {yearData.yearlyTheme}</Text>
          
          {yearData.subtopics?.map((subtopic: any, idx: number) => (
            <View key={idx} style={{ marginBottom: 18 }} wrap={false}>
              <Text style={{ fontWeight: 'bold', fontSize: 13.5, color: idx === 0 ? '#1E293B' : idx === 1 ? '#4338CA' : idx === 2 ? '#BE185D' : '#15803D', marginBottom: 6 }}>
                [{subtopic.subtitle}]
              </Text>
              {renderText(subtopic.content)}
            </View>
          ))}

          <View style={styles.footer} fixed>
            <Text>VIP 프리미엄 전략 보고서 | 미래 운세 분석</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}

      {/* 05. Action Plan */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.actionPlan?.title || "05. 운명을 바꾸는 마스터의 마스터플랜"}</Text>
        
        {parsedContent.actionPlan?.details?.map((detail: any, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }} wrap={false}>
            <Text style={styles.subTitle}>{detail.subtitle}</Text>
            {renderText(detail.content)}
          </View>
        ))}

        <View style={[styles.box, { backgroundColor: '#F8FAFC', borderLeftWidth: 6, borderLeftColor: '#1E293B', marginTop: 45 }]}>
          <Text style={[styles.boxTitle, { color: '#1E293B' }]}>마스터의 최종 제언</Text>
          <Text style={styles.paragraph}>
            본 보고서는 당신의 선천적 기질과 후천적 운의 흐름을 정밀하게 분석한 결과입니다. 
            위에서 제시한 현실적인 조언들을 생활 속에 적용하여, 타고난 운명을 넘어 당신이 원하는 최고의 성취를 이루시길 진심으로 기원합니다.
          </Text>
        </View>

        <View style={{ marginTop: 'auto', padding: 22, borderTopWidth: 1.5, borderTopColor: '#E2E8F0', alignItems: 'center' }}>
          <Text style={{ fontSize: 13.5, color: '#94A3B8', textAlign: 'center' }}>
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
