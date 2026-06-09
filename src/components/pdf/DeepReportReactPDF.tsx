import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, Rect, G, Circle, Line } from '@react-pdf/renderer';
import NotoSansKR from '../../assets/fonts/NotoSansKR.ttf';

// Font Registration - Noto Sans KR supports full CJK (Hanja) characters
Font.register({
  family: 'NotoSansKR',
  src: NotoSansKR,
});

// Prevent CJK hyphenation issues
Font.registerHyphenationCallback(word => [word]);

const styles = StyleSheet.create({
  page: {
    padding: '20mm',
    backgroundColor: '#ffffff',
    fontFamily: 'NotoSansKR',
    fontSize: 13,
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
    fontFamily: 'NotoSansKR',
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
    fontFamily: 'NotoSansKR',
    marginTop: 30,
    color: '#F8FAFC',
  },
  sectionTitle: {
    fontFamily: 'NotoSansKR',
    fontSize: 20,
    color: '#0F172A',
    borderBottom: '1.5pt solid #E2E8F0',
    paddingBottom: 12,
    marginBottom: 30,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  subTitle: {
    fontSize: 16,
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
    fontSize: 13,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 9,
    paddingLeft: 15,
  },
  bullet: {
    width: 15,
    fontSize: 13,
    color: '#6366F1',
    fontFamily: 'NotoSansKR',
  },
  bulletText: {
    flex: 1,
    fontFamily: 'NotoSansKR',
    fontSize: 13,
    lineHeight: 1.5,
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
  decorativeLine: {
    height: 1.5,
    width: 60,
    backgroundColor: '#FBBF24',
    marginTop: 5,
    marginBottom: 20,
  },
  premiumBox: {
    marginTop: 25,
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderLeft: '4pt solid #1E293B',
    borderTop: '0.5pt solid #E2E8F0',
    borderRight: '0.5pt solid #E2E8F0',
    borderBottom: '0.5pt solid #E2E8F0',
  },
});

interface SajuPillar {
  gan: string;
  zhi: string;
  ganShiShen: string;
  zhiShiShen: string;
  twelveStages: string;
  twelveSpirits: string;
  hiddenStems: string[];
}

interface SajuData {
  userSaju: {
    pillars: {
      year: SajuPillar;
      month: SajuPillar;
      day: SajuPillar;
      hour: SajuPillar;
    };
    dayMaster: {
      chinese: string;
      korean: string;
      description: string;
    };
    elements: {
      wood: number;
      fire: number;
      earth: number;
      metal: number;
      water: number;
    };
    elementRatio: {
      wood: number;
      fire: number;
      earth: number;
      metal: number;
      water: number;
    };
  };
}

interface ReportDetail {
  subtitle?: string;
  content?: string;
}

interface SajuReportContent {
  cover?: {
    mainTitle?: string;
    subTitle?: string;
  };
  natalChartAnalysis?: {
    title: string;
    details: ReportDetail[];
  };
  coreIdentity?: {
    title: string;
    details: ReportDetail[];
  };
  wealthAndCareer?: {
    title: string;
    details: ReportDetail[];
  };
  relationship?: {
    title: string;
    details: ReportDetail[];
  };
  threeYearRoadmap?: {
    title: string;
    details: {
      year: number;
      yearlyTheme: string;
      subtopics: ReportDetail[];
    }[];
  };
  specialRequestAnalysis?: {
    title: string;
    details: ReportDetail[];
  };
  actionPlan?: {
    title: string;
    details: ReportDetail[];
  };
  thisYearFortune?: {
    title: string;
    details: ReportDetail[];
  };
  counselingAndAdvice?: {
    title: string;
    details: ReportDetail[];
  };
  ratings?: {
    wealth: number;
    career: number;
    relationship: number;
    health: number;
  };
}

interface Props {
  sajuData: SajuData;
  parsedContent: SajuReportContent;
  clientName: string;
}

// Parses **bold** strings inside the text block
const parseBoldText = (text: string) => {
  const parts = text.split('**');
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <Text key={i} style={{ fontWeight: 'bold', color: '#0F172A' }}>
          {part}
        </Text>
      );
    }
    return part;
  });
};

const renderText = (text: string | undefined) => {
  if (!text) return null;
  
  const lines = text.split("\n");
  
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    
    if (trimmed.length === 0) {
      return <View key={idx} style={{ height: 10 }} />;
    }
    
    // Check if it's a takeaway highlight prefix (💡, [중요], [결론])
    const isHighlight = trimmed.startsWith('💡') || trimmed.startsWith('[중요]') || trimmed.startsWith('[결론]');
    if (isHighlight) {
      let bgColor = '#EFF6FF';
      let borderColor = '#3B82F6';
      let textColor = '#1E3A8A';
      
      if (trimmed.startsWith('💡')) {
        bgColor = '#FEF9C3';
        borderColor = '#F59E0B';
        textColor = '#713F12';
      } else if (trimmed.startsWith('[중요]')) {
        bgColor = '#FFE4E6';
        borderColor = '#EF4444';
        textColor = '#9F1239';
      } else if (trimmed.startsWith('[결론]')) {
        bgColor = '#E0E7FF';
        borderColor = '#6366F1';
        textColor = '#3730A3';
      }
      
      return (
        <View key={idx} style={{
          marginTop: 10,
          marginBottom: 10,
          padding: 12,
          backgroundColor: bgColor,
          borderRadius: 8,
          borderLeft: `4pt solid ${borderColor}`,
        }}>
          <Text style={{ fontFamily: 'NotoSansKR', fontSize: 12, color: textColor, lineHeight: 1.5 }}>
            {parseBoldText(trimmed)}
          </Text>
        </View>
      );
    }

    // Check for bullet patterns: - , • , * , 1. 
    const bulletMatch = line.match(/^(\s*)([-•*+]|\d+\.)\s+(.*)$/);
    
    if (bulletMatch) {
      const indentation = (bulletMatch[1]?.length || 0) * 8;
      const bulletType = bulletMatch[2] || '';
      const content = bulletMatch[3] || '';
      
      const displayBullet = /\d+\./.test(bulletType) ? bulletType : '•';

      return (
        <View key={idx} style={[styles.bulletPoint, { marginLeft: indentation, marginBottom: 8 }]}>
          <Text style={[styles.bullet, { width: /\d+\./.test(bulletType) ? 25 : 15 }]}>{displayBullet}</Text>
          <Text style={styles.bulletText}>{parseBoldText(content)}</Text>
        </View>
      );
    }
    
    return <Text key={idx} style={styles.paragraph}>{parseBoldText(trimmed)}</Text>;
  });
};

const FiveElementsChart: React.FC<{ elements: SajuData["userSaju"]["elementRatio"] }> = ({ elements }) => {
  if (!elements) return null;

  const data = [
    { label: '목(木)', value: elements.wood, color: '#10B981' },
    { label: '화(火)', value: elements.fire, color: '#EF4444' },
    { label: '토(土)', value: elements.earth, color: '#F59E0B' },
    { label: '금(金)', value: elements.metal, color: '#94A3B8' },
    { label: '수(水)', value: elements.water, color: '#3B82F6' },
  ];

  const chartHeight = 120;
  const chartWidth = 350;
  const barWidth = 45;
  const gap = 20;

  return (
    <View style={{ marginTop: 25, marginBottom: 30, alignItems: 'center' }}>
      <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 15, color: '#475569' }}>
        오행(五行) 에너지 분포도 (Percent)
      </Text>
      <Svg height={chartHeight + 40} width={chartWidth} viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}>
        {/* Grid Lines */}
        {[0, 25, 50, 75, 100].map((level) => (
          <G key={level}>
            <Line 
              x1="40" y1={chartHeight - (level * chartHeight / 100)} 
              x2={chartWidth} y2={chartHeight - (level * chartHeight / 100)} 
              stroke="#E2E8F0" strokeWidth="0.5" 
            />
            <Text x="0" y={chartHeight - (level * chartHeight / 100) + 4} style={{ fontSize: 9, fill: '#94A3B8' }}>{level}%</Text>
          </G>
        ))}

        {/* Bars */}
        {data.map((item, i) => {
          const barHeight = (item.value * chartHeight) / 100;
          const x = 50 + i * (barWidth + gap);
          return (
            <G key={item.label}>
              <Rect
                x={x}
                y={chartHeight - barHeight}
                width={barWidth}
                height={barHeight}
                fill={item.color}
                rx={4}
              />
              <Text 
                x={x + barWidth / 2} 
                y={chartHeight + 15} 
                textAnchor="middle" 
                style={{ fontSize: 11, fontWeight: 'bold', fill: '#1E293B', fontFamily: 'NotoSansKR' }}
              >
                {item.label}
              </Text>
              <Text 
                x={x + barWidth / 2} 
                y={chartHeight - barHeight - 5} 
                textAnchor="middle" 
                style={{ fontSize: 10, fontWeight: 'bold', fill: item.color, fontFamily: 'NotoSansKR' }}
              >
                {item.value}%
              </Text>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const DayMasterBox: React.FC<{ dayMaster: SajuData["userSaju"]["dayMaster"] }> = ({ dayMaster }) => {
  if (!dayMaster) return null;
  return (
    <View style={[styles.box, { borderLeft: '5pt solid #FBBF24', backgroundColor: '#FEFCE8', marginBottom: 20 }]}>
      <Text style={[styles.boxTitle, { color: '#854D0E', fontSize: 16 }]}>본신의 본질: {dayMaster.chinese} {dayMaster.korean} (日干)</Text>
      <Text style={[styles.paragraph, { marginBottom: 0, color: '#92400E', fontWeight: 'bold' }]}>{dayMaster.description}</Text>
    </View>
  );
};

const GAN_SINGLE_KOREAN: Record<string, string> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계'
};
const ZHI_SINGLE_KOREAN: Record<string, string> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진',
  '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유',
  '戌': '술', '亥': '해'
};

const SajuTable: React.FC<{ saju: SajuData["userSaju"] }> = ({ saju }) => {
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
            <Text style={styles.sajuValue}>{p?.gan ? `${GAN_SINGLE_KOREAN[p.gan] || p.gan}(${p.gan})` : "-"}</Text>
            <Text style={{ fontSize: 10, color: '#6366F1', marginTop: 2, fontWeight: 'bold' }}>{p?.ganShiShen || "-"}</Text>
          </View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>지지(地支)</Text>
            <Text style={styles.sajuValue}>{p?.zhi ? `${ZHI_SINGLE_KOREAN[p.zhi] || p.zhi}(${p.zhi})` : "-"}</Text>
            <Text style={{ fontSize: 10, color: '#4338CA', marginTop: 2, fontWeight: 'bold' }}>{p?.zhiShiShen || "-"}</Text>
          </View>
          <View style={[styles.sajuCell, { borderBottom: 0, backgroundColor: '#F8FAFC' }]}>
            <Text style={styles.sajuLabel}>12운성/신살</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1E293B' }}>{p?.twelveStages || "-"}</Text>
            <Text style={{ fontSize: 9, color: '#64748B', marginTop: 1 }}>{p?.twelveSpirits || "-"}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const RatingStars: React.FC<{ rating: number; color: string }> = ({ rating, color }) => {
  const stars = Array.from({ length: 5 }).map((_, idx) => {
    const filled = idx < rating;
    return (
      <Svg key={idx} width="14" height="14" viewBox="0 0 24 24" style={{ marginRight: 3 }}>
        <Path 
          d="M12 .587l3.668 7.431 8.2 1.19-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.208l8.2-1.19z" 
          fill={filled ? color : '#E2E8F0'} 
        />
      </Svg>
    );
  });
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
};

const FortuneRatingInfographic: React.FC<{ ratings?: { wealth: number; career: number; relationship: number; health: number } | undefined }> = ({ ratings }) => {
  const defaultRatings = ratings || { wealth: 4, career: 4, relationship: 3, health: 4 };

  const ratingList = [
    { label: '재물운 (Wealth)', value: defaultRatings.wealth, color: '#F59E0B', desc: '자산 관리 및 투자 성공 흐름' },
    { label: '직업운 (Career)', value: defaultRatings.career, color: '#6366F1', desc: '승진, 사업, 업무 성취 및 이직' },
    { label: '인연운 (Relationship)', value: defaultRatings.relationship, color: '#EC4899', desc: '대인관계, 연인, 소통 조화도' },
    { label: '건강운 (Health)', value: defaultRatings.health, color: '#10B981', desc: '신체/정신적 오행 에너지 균형' },
  ];

  return (
    <View style={{ marginTop: 15, marginBottom: 20, padding: 15, backgroundColor: '#F8FAFC', borderRadius: 12, border: '0.75pt solid #E2E8F0' }}>
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1E293B', marginBottom: 12, textAlign: 'center', fontFamily: 'NotoSansKR' }}>
        올해 분야별 핵심 길흉 지표 (Fortune Index)
      </Text>
      
      <View style={{ borderBottom: '0.75pt solid #E2E8F0', paddingBottom: 6, marginBottom: 8, flexDirection: 'row', fontWeight: 'bold', fontSize: 10, color: '#64748B' }}>
        <Text style={{ flex: 1.5, fontFamily: 'NotoSansKR' }}>운세 영역</Text>
        <Text style={{ flex: 1.5, textAlign: 'center', fontFamily: 'NotoSansKR' }}>만족도 (별점)</Text>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: 'NotoSansKR' }}>수치</Text>
        <Text style={{ flex: 2, fontFamily: 'NotoSansKR' }}>지표 상세 설명</Text>
      </View>

      {ratingList.map((item, idx) => (
        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottom: idx === ratingList.length - 1 ? 0 : '0.5pt solid #F1F5F9' }}>
          <View style={{ flex: 1.5 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#334155', fontFamily: 'NotoSansKR' }}>{item.label}</Text>
          </View>
          <View style={{ flex: 1.5, alignItems: 'center' }}>
            <RatingStars rating={item.value} color={item.color} />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.color }}>{item.value * 20}%</Text>
          </View>
          <View style={{ flex: 2 }}>
            <Text style={{ fontSize: 9, color: '#64748B', fontFamily: 'NotoSansKR' }}>{item.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export const DeepReportReactPDF: React.FC<Props> = ({ sajuData, parsedContent, clientName }) => {
  const isCounselingReport = parsedContent.counselingAndAdvice !== undefined;

  if (isCounselingReport) {
    return (
      <Document>
        {/* Cover Page */}
        <Page size="A4" style={styles.coverPage}>
          <View style={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
            <Svg width="300" height="300" viewBox="0 0 100 100">
              <Circle cx="100" cy="0" r="80" fill="#FBBF24" />
              <Circle cx="100" cy="0" r="60" fill="none" stroke="#ffffff" strokeWidth="1" />
            </Svg>
          </View>

          <Text style={styles.coverSubtitle}>1:1 사주 고민 상담 리포트</Text>
          
          <View style={{ marginVertical: 40, alignItems: 'center' }}>
            <Svg width="80" height="80" viewBox="0 0 100 100">
              <Path d="M50 5 L95 25 L95 75 L50 95 L5 75 L5 25 Z" fill="none" stroke="#FBBF24" strokeWidth="2" />
              <Path d="M50 15 L85 30 L85 70 L50 85 L15 70 L15 30 Z" fill="#FBBF24" opacity="0.2" />
              <Text x="50" y="55" textAnchor="middle" style={{ fontSize: 10, fill: '#FBBF24', fontFamily: 'NotoSansKR' }}>命</Text>
            </Svg>
          </View>

          <Text style={styles.coverTitle}>{parsedContent.cover?.mainTitle || `${clientName} 님 고민 상담 리포트`}</Text>
          
          <View style={{ height: 2, width: 120, backgroundColor: '#FBBF24', marginVertical: 35 }} />
          
          <Text style={styles.clientName}>{clientName} 님</Text>
          
          <Text style={{ marginTop: 50, fontSize: 16, color: '#94A3B8', textAlign: 'center', width: '70%', lineHeight: 1.5 }}>
            {parsedContent.cover?.subTitle || "명리학적 해법을 통한 1:1 맞춤 고민 카운셀링"}
          </Text>
          
          <View style={{ marginTop: 120, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#475569', letterSpacing: 2 }}>ANTIGRAVITY MASTER COUNSELING</Text>
            <Text style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </Page>

        {/* Page 1: 사주 및 만세력 분석 */}
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{parsedContent.natalChartAnalysis?.title || "01. 사주 및 만세력 분석"}</Text>
          
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.subTitle, { borderLeftColor: '#FBBF24' }]}>사주 원국 테이블 (四柱 元局)</Text>
            <DayMasterBox dayMaster={sajuData?.userSaju?.dayMaster} />
            <SajuTable saju={sajuData?.userSaju} />
            <FiveElementsChart elements={sajuData?.userSaju?.elementRatio} />
          </View>

          {parsedContent.natalChartAnalysis?.details?.map((detail: ReportDetail, idx: number) => (
            <View key={idx} style={{ marginBottom: 20 }}>
              {detail.subtitle && <Text style={styles.subTitle}>{detail.subtitle}</Text>}
              {renderText(detail.content)}
            </View>
          ))}
          
          <View style={styles.footer} fixed>
            <Text>1:1 사주 고민 상담 리포트 | 사주 및 만세력 분석</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>

        {/* Page 2: 올해 대운세 분석 */}
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{parsedContent.thisYearFortune?.title || "02. 올해 대운세 분석"}</Text>
          
          <FortuneRatingInfographic ratings={parsedContent.ratings} />

          {parsedContent.thisYearFortune?.details?.map((detail: ReportDetail, idx: number) => (
            <View key={idx} style={{ marginBottom: 20 }}>
              {detail.subtitle && <Text style={[styles.subTitle, { borderLeftColor: '#10B981' }]}>{detail.subtitle}</Text>}
              {renderText(detail.content)}
            </View>
          ))}
          
          <View style={styles.footer} fixed>
            <Text>1:1 사주 고민 상담 리포트 | 올해 대운세 분석</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>

        {/* Page 3: 고민 분석 및 조언 */}
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{parsedContent.counselingAndAdvice?.title || "03. 고민 분석 및 조언"}</Text>
          
          {parsedContent.counselingAndAdvice?.details?.map((detail: ReportDetail, idx: number) => (
            <View key={idx} style={{ marginBottom: 20 }}>
              {detail.subtitle && <Text style={[styles.subTitle, { borderLeftColor: '#EF4444' }]}>{detail.subtitle}</Text>}
              {renderText(detail.content)}
            </View>
          ))}
          
          <View style={styles.footer} fixed>
            <Text>1:1 사주 고민 상담 리포트 | 고민 분석 및 조언</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      </Document>
    );
  }

  // Standard 4-Year deep report
  return (
    <Document>
      {/* 00. Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        {/* Decorative background element */}
        <View style={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
          <Svg width="300" height="300" viewBox="0 0 100 100">
            <Circle cx="100" cy="0" r="80" fill="#FBBF24" />
            <Circle cx="100" cy="0" r="60" fill="none" stroke="#ffffff" strokeWidth="1" />
          </Svg>
        </View>

        <Text style={styles.coverSubtitle}>VIP 프리미엄 전략 보고서</Text>
        
        <View style={{ marginVertical: 40, alignItems: 'center' }}>
          <Svg width="80" height="80" viewBox="0 0 100 100">
            <Path d="M50 5 L95 25 L95 75 L50 95 L5 75 L5 25 Z" fill="none" stroke="#FBBF24" strokeWidth="2" />
            <Path d="M50 15 L85 30 L85 70 L50 85 L15 70 L15 30 Z" fill="#FBBF24" opacity="0.2" />
            <Text x="50" y="55" textAnchor="middle" style={{ fontSize: 10, fill: '#FBBF24', fontFamily: 'NotoSansKR' }}>命</Text>
          </Svg>
        </View>

        <Text style={styles.coverTitle}>{parsedContent.cover?.mainTitle || `${clientName} 님 심층 리포트`}</Text>
        
        <View style={{ height: 2, width: 120, backgroundColor: '#FBBF24', marginVertical: 35 }} />
        
        <Text style={styles.clientName}>{clientName} 님</Text>
        
        <Text style={{ marginTop: 50, fontSize: 16, color: '#94A3B8', textAlign: 'center', width: '70%', lineHeight: 1.5 }}>
          {parsedContent.cover?.subTitle || "명리학과 심리학의 융합을 통한 인생 설계"}
        </Text>
        
        <View style={{ marginTop: 120, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: '#475569', letterSpacing: 2 }}>ANTIGRAVITY MASTER ANALYSIS</Text>
          <Text style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>
      </Page>

      {/* 00. Natal Chart Analysis */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.natalChartAnalysis?.title || "00. 사주원국(四柱原局) 심층 분석"}</Text>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.subTitle, { borderLeftColor: '#FBBF24' }]}>사주 원국 테이블 (四柱 元局)</Text>
          <DayMasterBox dayMaster={sajuData?.userSaju?.dayMaster} />
          <SajuTable saju={sajuData?.userSaju} />
          <FiveElementsChart elements={sajuData?.userSaju?.elementRatio} />
        </View>

        {parsedContent.natalChartAnalysis?.details?.map((detail: ReportDetail, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }}>
            {detail.subtitle && <Text style={styles.subTitle}>{detail.subtitle}</Text>}
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

        {parsedContent.coreIdentity?.details?.map((detail: ReportDetail, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }}>
            {detail.subtitle && <Text style={styles.subTitle}>{detail.subtitle}</Text>}
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
        
        {parsedContent.wealthAndCareer?.details?.map((detail: ReportDetail, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }}>
            {detail.subtitle && <Text style={[styles.subTitle, { borderLeftColor: '#0369A1' }]}>{detail.subtitle}</Text>}
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
        
        {parsedContent.relationship?.details?.map((detail: ReportDetail, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }}>
            {detail.subtitle && <Text style={[styles.subTitle, { borderLeftColor: '#BE185D' }]}>{detail.subtitle}</Text>}
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
          
          {yearData.subtopics?.map((subtopic: ReportDetail, idx: number) => (
            <View key={idx} style={{ marginBottom: 18 }}>
              {subtopic.subtitle && (
                <Text style={{ fontWeight: 'bold', fontSize: 13.5, color: idx === 0 ? '#1E293B' : idx === 1 ? '#4338CA' : idx === 2 ? '#BE185D' : '#15803D', marginBottom: 6 }}>
                  [{subtopic.subtitle}]
                </Text>
              )}
              {renderText(subtopic.content)}
            </View>
          ))}

          <View style={styles.footer} fixed>
            <Text>VIP 프리미엄 전략 보고서 | 미래 운세 분석</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}

      {/* 05. Special Request Analysis */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.specialRequestAnalysis?.title || "05. 내담자 특별 요청사항에 대한 명리적 해답"}</Text>
        
        {parsedContent.specialRequestAnalysis?.details?.map((detail: ReportDetail, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }}>
            {detail.subtitle && <Text style={[styles.subTitle, { borderLeftColor: '#4F46E5' }]}>{detail.subtitle}</Text>}
            {renderText(detail.content)}
          </View>
        ))}
        
        <View style={styles.footer} fixed>
          <Text>VIP 프리미엄 전략 보고서 | 특별 요청사항 분석</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* 06. Action Plan */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{parsedContent.actionPlan?.title || "06. 운명을 바꾸는 마스터의 마스터플랜"}</Text>
        
        {parsedContent.actionPlan?.details?.map((detail: ReportDetail, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }}>
            {detail.subtitle && <Text style={styles.subTitle}>{detail.subtitle}</Text>}
            {renderText(detail.content)}
          </View>
        ))}

        <View style={styles.premiumBox}>
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
