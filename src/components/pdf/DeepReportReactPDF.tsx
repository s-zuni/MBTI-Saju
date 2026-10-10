import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, Rect, G, Circle, Line } from '@react-pdf/renderer';
import NotoSansKR from '../../assets/fonts/NotoSansKR.ttf';
import NanumGothicRegular from '../../assets/fonts/NanumGothic-Regular.ttf';
import NanumGothicBold from '../../assets/fonts/NanumGothic-Bold.ttf';

// Font Registration - Noto Sans KR supports full CJK (Hanja) characters
Font.register({
  family: 'NotoSansKR',
  src: NotoSansKR,
});

// 표지 전용: 굵기(400/700)를 실제로 구분할 수 있는 한글 폰트. 본문은 한자 병기를 위해 NotoSansKR 을 그대로 쓴다.
Font.register({
  family: 'NanumGothic',
  fonts: [
    { src: NanumGothicRegular, fontWeight: 400 },
    { src: NanumGothicBold, fontWeight: 700 },
  ],
});

// Prevent CJK hyphenation issues
Font.registerHyphenationCallback(word => [word]);

const styles = StyleSheet.create({
  page: {
    padding: '16mm 17mm 20mm 17mm',
    backgroundColor: '#ffffff',
    fontFamily: 'NotoSansKR',
    fontSize: 11,
    lineHeight: 1.62,
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
    fontSize: 18,
    color: '#0F172A',
    borderBottom: '1.5pt solid #E2E8F0',
    paddingBottom: 10,
    marginBottom: 18,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 7,
    borderLeft: '4.5pt solid #6366F1',
    paddingLeft: 15,
    fontFamily: 'NotoSansKR',
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'left',
    fontFamily: 'NotoSansKR',
    color: '#334155',
    fontSize: 11,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 9,
    paddingLeft: 4,
  },
  bullet: {
    width: 15,
    fontSize: 11,
    color: '#6366F1',
    fontFamily: 'NotoSansKR',
  },
  bulletText: {
    flex: 1,
    fontFamily: 'NotoSansKR',
    fontSize: 11,
    lineHeight: 1.62,
    color: '#334155',
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
    marginBottom: 10,
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
    marginTop: 14,
    padding: 14,
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

type YearScores = { wealth: number; career: number; love: number; health: number };

interface StoryArc {
  thread?: string;
  motif?: string;
  pastHook?: string;
  chapters?: { year: number; role?: string; title?: string; oneLine?: string }[];
}

interface CalendarYear {
  year: number;
  /** 올해 남은 기간처럼 일부 달만 있는 행 */
  partial?: boolean;
  months: { label: string; nextYear?: boolean; score: number; start?: string }[];
}

interface PartnerOverlapRow {
  year: number;
  mine: number;
  partner: number;
  label: string;
}

// schemaVersion 3 에서 추가된 필드(storyArc, pastCheck, strength, calendar, partnerOverlap 등)는 모두 선택값이다.
// 이전 버전(2) 리포트도 같은 컴포넌트로 그대로 렌더링된다.
interface SajuReportContent {
  schemaVersion?: number;
  cover?: {
    mainTitle?: string;
    subTitle?: string;
  };
  summary?: {
    keywords?: string[];
    verdict?: string;
    concernAnswer?: string;
    topActions?: string[];
    yearOverview?: {
      year: number;
      ganji?: string;
      yearlyTheme: string;
      oneLine?: string;
      role?: string;
      scores: YearScores;
      bestMonths?: number[];
      cautionMonths?: number[];
    }[];
    bestYear?: number | null;
    cautionYear?: number | null;
  };
  storyArc?: StoryArc | null;
  strength?: { label: string; supportRatio: number; yongshin: string[]; gisin: string[] };
  natalChartAnalysis?: { title: string; details: ReportDetail[] };
  pastCheck?: { title: string; details: ReportDetail[] };
  coreIdentity?: { title: string; details: ReportDetail[] };
  wealthAndCareer?: { title: string; details: ReportDetail[] };
  relationship?: { title: string; details: ReportDetail[] };
  threeYearRoadmap?: {
    title: string;
    details: {
      year: number;
      ganji?: string;
      yearlyTheme: string;
      oneLine?: string;
      role?: string;
      scores?: YearScores;
      bestMonths?: number[];
      cautionMonths?: number[];
      subtopics: ReportDetail[];
    }[];
  };
  currentYear?: {
    year: number;
    ganji?: string;
    yearlyTheme: string;
    oneLine?: string;
    role?: string;
    scores?: YearScores;
    bestMonths?: number[];
    cautionMonths?: number[];
    subtopics: ReportDetail[];
  };
  calendar?: CalendarYear[];
  partnerOverlap?: PartnerOverlapRow[];
  partnerName?: string;
  specialRequestAnalysis?: { title: string; details: ReportDetail[] };
  actionPlan?: { title: string; details: ReportDetail[] };
  generated_at?: string;
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
  
  const lines = text.trim().split("\n");

  return lines.map((line, idx) => {
    const trimmed = line.trim();
    // 마지막 줄의 아래 여백이 페이지 하단을 넘겨 푸터만 있는 빈 페이지가 생기는 것을 막는다
    const isLast = idx === lines.length - 1;

    if (trimmed.length === 0) {
      return <View key={idx} style={{ height: 4 }} />;
    }
    
    // 핵심요약(💡) / 중요 / 결론 하이라이트. NotoSansKR 에는 이모지 글리프가 없으므로 라벨 칩으로 대체한다.
    const hl = trimmed.startsWith('💡')
      ? { label: '핵심 요약', bg: '#FEF9C3', border: '#F59E0B', fg: '#713F12', prefix: '💡' }
      : trimmed.startsWith('[중요]')
        ? { label: '실천 팁', bg: '#FFE4E6', border: '#EF4444', fg: '#9F1239', prefix: '[중요]' }
        : trimmed.startsWith('[결론]')
          ? { label: '결론', bg: '#E0E7FF', border: '#6366F1', fg: '#3730A3', prefix: '[결론]' }
          : null;
    if (hl) {
      return (
        <View key={idx} wrap={false} style={{
          marginTop: 4,
          marginBottom: isLast ? 0 : 8,
          padding: 8,
          backgroundColor: hl.bg,
          borderRadius: 8,
          borderLeft: `4pt solid ${hl.border}`,
        }}>
          <Text style={{ fontFamily: 'NotoSansKR', fontSize: 9, color: hl.border, fontWeight: 'bold', marginBottom: 3 }}>{hl.label}</Text>
          <Text style={{ fontFamily: 'NotoSansKR', fontSize: 11, color: hl.fg, lineHeight: 1.6 }}>
            {parseBoldText(trimmed.slice(hl.prefix.length).trim())}
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
        <View key={idx} wrap={false} style={[styles.bulletPoint, { marginLeft: indentation, marginBottom: isLast ? 0 : 5 }]}>
          <Text style={[styles.bullet, { width: /\d+\./.test(bulletType) ? 25 : 15 }]}>{displayBullet}</Text>
          <Text style={styles.bulletText}>{parseBoldText(content)}</Text>
        </View>
      );
    }
    
    return <Text key={idx} style={isLast ? [styles.paragraph, { marginBottom: 0 }] : styles.paragraph}>{parseBoldText(trimmed)}</Text>;
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

  const chartHeight = 90;
  const chartWidth = 350;
  const barWidth = 45;
  const gap = 20;

  return (
    <View wrap={false} style={{ marginTop: 10, marginBottom: 14, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#475569' }}>
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
    <View style={[styles.box, { borderLeft: '5pt solid #FBBF24', backgroundColor: '#FEFCE8', marginTop: 4, marginBottom: 12, padding: 12 }]}>
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

const KO_TO_HANJA_GAN: Record<string, string> = Object.fromEntries(Object.entries(GAN_SINGLE_KOREAN).map(([h, k]) => [k, h]));
const KO_TO_HANJA_ZHI: Record<string, string> = Object.fromEntries(Object.entries(ZHI_SINGLE_KOREAN).map(([h, k]) => [k, h]));
// 한자·한글 어느 쪽으로 저장돼 있어도 "갑(甲)" 형태로 표기
const labelChar = (ch: string | undefined, toKo: Record<string, string>, toHanja: Record<string, string>) => {
  if (!ch || ch === '?') return '-';
  const ko = toKo[ch] || ch;
  const hanja = toHanja[ko] || (toKo[ch] ? ch : '');
  return hanja ? `${ko}(${hanja})` : ko;
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
            <Text style={styles.sajuValue}>{labelChar(p?.gan, GAN_SINGLE_KOREAN, KO_TO_HANJA_GAN)}</Text>
            <Text style={{ fontSize: 10, color: '#6366F1', marginTop: 2, fontWeight: 'bold' }}>{p?.ganShiShen || "-"}</Text>
          </View>
          <View style={styles.sajuCell}>
            <Text style={styles.sajuLabel}>지지(地支)</Text>
            <Text style={styles.sajuValue}>{labelChar(p?.zhi, ZHI_SINGLE_KOREAN, KO_TO_HANJA_ZHI)}</Text>
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

const SCORE_FIELDS = [
  { key: 'wealth', label: '재물', color: '#F59E0B' },
  { key: 'career', label: '커리어', color: '#6366F1' },
  { key: 'love', label: '인연', color: '#EC4899' },
  { key: 'health', label: '건강', color: '#10B981' },
] as const;

const formatMonths = (m?: number[]) => (m && m.length ? m.map(x => `${x}월`).join(', ') : '-');

const ScoreCell: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <View style={{ flex: 1 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
      <Text style={{ fontSize: 9.5, color: '#475569' }}>{label}</Text>
      <Text style={{ fontSize: 9.5, color, fontWeight: 'bold' }}>{value}/5</Text>
    </View>
    <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3 }}>
      <View style={{ width: `${Math.max(0, Math.min(5, value)) * 20}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
    </View>
  </View>
);

const ScoreGrid: React.FC<{ scores?: YearScores | undefined }> = ({ scores }) => {
  if (!scores) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
      {SCORE_FIELDS.map(f => <ScoreCell key={f.key} label={f.label} value={scores[f.key]} color={f.color} />)}
    </View>
  );
};

const StrengthLine: React.FC<{ strength?: SajuReportContent['strength'] }> = ({ strength }) => {
  if (!strength) return null;
  const join = (a: string[]) => (a.length ? a.join(' · ') : '뚜렷하지 않음');
  return (
    <View wrap={false} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      <Text style={{ fontSize: 10, color: '#3730A3', backgroundColor: '#E0E7FF', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10, fontWeight: 'bold' }}>일간 강약 {strength.label} ({strength.supportRatio}%)</Text>
      <Text style={{ fontSize: 10, color: '#047857', backgroundColor: '#D1FAE5', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10, fontWeight: 'bold' }}>힘이 되는 오행 {join(strength.yongshin)}</Text>
      <Text style={{ fontSize: 10, color: '#B45309', backgroundColor: '#FEF3C7', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10, fontWeight: 'bold' }}>부담이 되는 오행 {join(strength.gisin)}</Text>
    </View>
  );
};

const ArcCard: React.FC<{ arc?: StoryArc | null | undefined }> = ({ arc }) => {
  if (!arc || !arc.thread) return null;
  return (
    <View wrap={false} style={{ padding: 14, backgroundColor: '#0F172A', borderRadius: 12, marginBottom: 12 }}>
      <Text style={{ fontSize: 9, color: '#FBBF24', letterSpacing: 2, marginBottom: 5, fontWeight: 'bold' }}>THE STORY OF YOUR 3 YEARS</Text>
      <Text style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 'bold', lineHeight: 1.5, marginBottom: 3 }}>{arc.thread}</Text>
      {arc.motif ? <Text style={{ fontSize: 10.5, color: '#94A3B8', marginBottom: 9 }}>{arc.motif}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(arc.chapters || []).map(c => (
          <View key={c.year} style={{ flex: 1, padding: 8, backgroundColor: '#1E293B', borderRadius: 8 }}>
            <Text style={{ fontSize: 15, lineHeight: 1.25, color: '#FBBF24', fontWeight: 'bold' }}>{c.year}</Text>
            {c.role ? <Text style={{ fontSize: 9, color: '#A5B4FC', fontWeight: 'bold', marginTop: 1 }}>{c.role}</Text> : null}
            <Text style={{ fontSize: 10.5, color: '#F8FAFC', fontWeight: 'bold', marginTop: 3, lineHeight: 1.4 }}>{c.title}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const HEAT_COLORS: Record<number, string> = { 1: '#FCA5A5', 2: '#FED7AA', 3: '#E2E8F0', 4: '#BBF7D0', 5: '#4ADE80' };

const MonthHeatmap: React.FC<{ calendar?: CalendarYear[] | undefined }> = ({ calendar }) => {
  if (!calendar || !calendar.length) return null;
  return (
    <View wrap={false} style={{ marginBottom: 12 }}>
      <Text style={[styles.subTitle, { marginTop: 0 }]}>36개월 운의 지도</Text>
      {calendar.map(y => (
        <View key={y.year} style={{ marginBottom: 6 }}>
          <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 }}>{y.year}년{y.partial ? ' (올해 남은 기간)' : ''}</Text>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {y.months.map((m, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 4, backgroundColor: HEAT_COLORS[m.score] || '#E2E8F0', borderRadius: 4 }}>
                <Text style={{ fontSize: 8, color: '#334155' }}>{m.label}{m.nextYear ? '*' : ''}</Text>
                <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: '#0F172A' }}>{m.score}</Text>
              </View>
            ))}
            {Array.from({ length: Math.max(0, 12 - y.months.length) }).map((_, i) => <View key={`pad${i}`} style={{ flex: 1 }} />)}
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: HEAT_COLORS[n] || '#E2E8F0' }} />
            <Text style={{ fontSize: 8, color: '#64748B' }}>{n === 1 ? '조심' : n === 3 ? '보통' : n === 5 ? '좋음' : ''}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 8, color: '#94A3B8', marginLeft: 4 }}>※ 절기월 기준(월 시작은 절입일), * 는 이듬해 1월</Text>
      </View>
    </View>
  );
};

const OVERLAP_COLOR: Record<string, string> = { '함께 좋은 해': '#047857', '함께 조심할 해': '#B45309', '엇갈리는 해': '#4338CA' };

const PartnerOverlap: React.FC<{ rows?: PartnerOverlapRow[] | undefined; name?: string | undefined }> = ({ rows, name }) => {
  if (!rows || !rows.length) return null;
  return (
    <View wrap={false} style={{ marginBottom: 12 }}>
      <Text style={[styles.subTitle, { marginTop: 0 }]}>{name ? `${name} 님과 나의 3년 겹침` : '두 사람의 3년 겹침'}</Text>
      {rows.map(r => (
        <View key={r.year} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottom: '0.5pt solid #E2E8F0' }}>
          <Text style={{ width: 44, fontSize: 11, fontWeight: 'bold', color: '#0F172A' }}>{r.year}</Text>
          <Text style={{ flex: 1, fontSize: 10, color: '#475569' }}>나 {r.mine}/20 · 상대 {r.partner}/20</Text>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: OVERLAP_COLOR[r.label] || '#334155' }}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
};

// 푸터는 자식 View 없이 단일 fixed Text 로 둔다. (View 를 자식으로 둔 fixed 푸터는 긴 본문 흐름에서 react-pdf 레이아웃 오류를 일으킨다)
const Footer: React.FC<{ label: string }> = ({ label }) => (
  <Text
    fixed
    style={{ position: 'absolute', bottom: '9mm', left: '17mm', right: '17mm', borderTop: '0.75pt solid #E2E8F0', paddingTop: 7, fontSize: 9, color: '#94A3B8', textAlign: 'right' }}
    render={({ pageNumber, totalPages }) => `MBTIJU 3개년 심층 리포트  |  ${label}  |  ${pageNumber} / ${totalPages}`}
  />
);

interface SectionProps {
  title: string;
  accent?: string;
  first?: boolean;
  details?: ReportDetail[] | undefined;
  intro?: React.ReactNode;
  children?: React.ReactNode;
}

// 섹션은 페이지를 강제로 나누지 않고 이어서 흐른다(섹션 끝의 빈 페이지 방지). 제목은 뒤따르는 내용과 떨어지지 않도록 보호한다.
const Section: React.FC<SectionProps> = ({ title, accent = '#6366F1', first, details, intro, children }) => (
  <>
    <Text style={[styles.sectionTitle, first ? {} : { marginTop: 20 }]} minPresenceAhead={160}>{title}</Text>
    {intro}
    {details?.map((detail, idx) => (
      <View key={idx} style={{ marginBottom: 8 }}>
        {detail.subtitle && <Text style={[styles.subTitle, { borderLeftColor: accent }]} minPresenceAhead={90}>{detail.subtitle}</Text>}
        {renderText(detail.content)}
      </View>
    ))}
    {children}
  </>
);

interface YearPageProps {
  y: NonNullable<SajuReportContent['threeYearRoadmap']>['details'][number];
  /** 개요 페이지가 없는 이전 버전(schemaVersion 2) 리포트의 첫 해 페이지에 섹션 제목을 둔다 */
  heading?: string | undefined;
  /** 소제목 앞에 붙는 라벨 (예: '2027년') */
  tag: string;
  footer: string;
  /** 올해 남은 기간 표시 */
  partialNote?: string | undefined;
}

const YearPage: React.FC<YearPageProps> = ({ y, heading, tag, footer, partialNote }) => (
  <Page size="A4" style={styles.page} wrap>
    {heading ? <Text style={styles.sectionTitle}>{heading}</Text> : null}

    <View wrap={false} style={{ padding: 14, backgroundColor: '#0F172A', borderRadius: 12, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, minHeight: 36 }}>
        <Text style={{ fontSize: 28, lineHeight: 1.15, color: '#FBBF24', fontWeight: 'bold' }}>{y.year}</Text>
        {y.ganji ? <Text style={{ fontSize: 13, color: '#CBD5E1', marginLeft: 8, marginBottom: 4 }}>{y.ganji}년</Text> : null}
        {y.role ? <Text style={{ fontSize: 10, color: '#0F172A', backgroundColor: '#FBBF24', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, marginLeft: 10, marginBottom: 6, fontWeight: 'bold' }}>{y.role}</Text> : null}
      </View>
      {partialNote ? <Text style={{ fontSize: 10, color: '#A5B4FC', marginBottom: 3, fontWeight: 'bold' }}>{partialNote}</Text> : null}
      <Text style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 'bold', marginBottom: 3 }}>{y.yearlyTheme}</Text>
      {y.oneLine ? <Text style={{ fontSize: 10.5, color: '#94A3B8', marginBottom: 8 }}>{y.oneLine}</Text> : null}
      {y.scores && (
        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 9 }}>
          <ScoreGrid scores={y.scores} />
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ flex: 1, fontSize: 10, color: '#047857' }}>좋은 달  {formatMonths(y.bestMonths)}</Text>
            <Text style={{ flex: 1, fontSize: 10, color: '#B45309' }}>조심할 달  {formatMonths(y.cautionMonths)}</Text>
          </View>
        </View>
      )}
    </View>

    {y.subtopics?.map((subtopic, idx) => (
      <View key={idx} style={{ marginBottom: idx === (y.subtopics?.length ?? 0) - 1 ? 0 : 8 }}>
        {subtopic.subtitle && (
          <Text minPresenceAhead={90} style={[styles.subTitle, { marginTop: 8, borderLeftColor: idx === 0 ? '#1E293B' : idx === 1 ? '#4338CA' : idx === 2 ? '#BE185D' : '#15803D' }]}>
            {tag} · {subtopic.subtitle}
          </Text>
        )}
        {renderText(subtopic.content)}
      </View>
    ))}
    <Footer label={footer} />
  </Page>
);

export const DeepReportReactPDF: React.FC<Props> = ({ sajuData, parsedContent, clientName }) => {
  const c = parsedContent;
  const years = c.threeYearRoadmap?.details || [];
  const range = years.length ? `${years[0]!.year}~${years[years.length - 1]!.year}` : '';
  const dateText = new Date(c.generated_at || Date.now()).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const toc = [
    c.summary && { no: '', title: '한눈에 보기', desc: `${range} 3개년 요약과 연도별 비교` },
    c.natalChartAnalysis && { no: '01', title: '프롤로그 — 나라는 사람의 뼈대', desc: '타고난 사주의 구조, 일간 강약과 오행 균형' },
    c.pastCheck && { no: '02', title: '지나온 길 — 이미 일어난 이야기', desc: '지난 3년을 사주로 되짚어 봅니다' },
    c.specialRequestAnalysis && { no: '03', title: '지금의 고민, 마스터의 답', desc: '남겨주신 고민을 사주로 풀어드립니다' },
    c.coreIdentity && { no: '04', title: '내면의 지도', desc: '강점·무의식·숨은 리스크' },
    c.wealthAndCareer && { no: '05', title: '일과 돈의 그릇', desc: '맞는 일, 돈이 모이는 방식' },
    c.relationship && { no: '06', title: '인연의 지도', desc: '귀인·연애 패턴·악연' },
    c.currentYear && { no: '07', title: '올해 남은 기간 — 서막', desc: `${c.currentYear.year}년 남은 달별 흐름과 새해 준비` },
    years.length > 0 && { no: '08', title: `앞으로 3년의 이야기 (${range})`, desc: '36개월 운의 지도와 연도별 이야기' },
    c.actionPlan && { no: '09', title: '에필로그 — 마스터플랜', desc: '오늘부터 시작할 실천 체크리스트' },
  ].filter(Boolean) as { no: string; title: string; desc: string }[];

  const hasOverview = !!(c.storyArc?.thread || c.calendar?.length || c.partnerOverlap?.length);

  let firstSectionDone = false;
  const isFirst = () => { const r = !firstSectionDone; firstSectionDone = true; return r; };

  return (
    <Document>
      {/* 표지: 흰 바탕 + 검정 글씨 + 브랜드 포인트(바이올렛, 로고의 핑크 점)만 사용 */}
      <Page size="A4" style={{ backgroundColor: '#FFFFFF', fontFamily: 'NanumGothic', color: '#0F172A', padding: '48pt 52pt 40pt 52pt' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '0.75pt solid #E2E8F0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Svg width="26" height="26" viewBox="0 0 100 100">
              <Path d="M22 66 V24 L50 49 L78 24 V56 C78 68 66 76 53 76" stroke="#0F172A" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Circle cx="50" cy="27" r="7.5" fill="#FFB7B2" />
            </Svg>
            <Text style={{ fontFamily: 'NanumGothic', fontWeight: 700, fontSize: 13, letterSpacing: 2.5, marginLeft: 9 }}>MBTIJU</Text>
          </View>
          <Text style={{ fontFamily: 'NanumGothic', fontSize: 8.5, letterSpacing: 2, color: '#64748B' }}>3-YEAR DEEP REPORT</Text>
        </View>

        <View style={{ flexGrow: 1, justifyContent: 'center', paddingRight: 28 }}>
          <Text style={{ fontFamily: 'NanumGothic', fontWeight: 700, fontSize: 10, letterSpacing: 2.5, color: '#7C3AED' }}>
            {c.currentYear ? '올해 남은 기간 + ' : ''}{range ? `${range} 3개년` : '3개년'} 프리미엄 사주 리포트
          </Text>
          <View style={{ width: 34, height: 3, backgroundColor: '#7C3AED', marginTop: 12, marginBottom: 28 }} />
          <Text style={{ fontFamily: 'NanumGothic', fontWeight: 700, fontSize: 40, lineHeight: 1.28, letterSpacing: -1, color: '#0F172A' }}>
            {c.cover?.mainTitle || `${clientName} 님의 3년 리포트`}
          </Text>
          <Text style={{ fontFamily: 'NanumGothic', fontSize: 14, lineHeight: 1.7, color: '#475569', marginTop: 22, width: '88%' }}>
            {c.cover?.subTitle || '명리학과 심리학의 융합을 통한 인생 설계'}
          </Text>
        </View>

        <View style={{ borderTop: '1.5pt solid #0F172A', paddingTop: 16 }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 0.9, paddingRight: 10 }}>
              <Text style={{ fontFamily: 'NanumGothic', fontSize: 8, letterSpacing: 1.5, color: '#64748B', marginBottom: 5 }}>PREPARED FOR</Text>
              <Text style={{ fontFamily: 'NanumGothic', fontWeight: 700, fontSize: 13 }}>{clientName} 님</Text>
            </View>
            <View style={{ flex: 1.7, paddingRight: 10 }}>
              <Text style={{ fontFamily: 'NanumGothic', fontSize: 8, letterSpacing: 1.5, color: '#64748B', marginBottom: 5 }}>PERIOD</Text>
              <Text style={{ fontFamily: 'NanumGothic', fontWeight: 700, fontSize: 13 }}>{c.currentYear ? `${c.currentYear.year} 남은 기간 + ` : ''}{range.replace('~', '–')}</Text>
            </View>
            <View style={{ flex: 1.2 }}>
              <Text style={{ fontFamily: 'NanumGothic', fontSize: 8, letterSpacing: 1.5, color: '#64748B', marginBottom: 5 }}>ISSUED</Text>
              <Text style={{ fontFamily: 'NanumGothic', fontWeight: 700, fontSize: 13 }}>{dateText}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: 'NanumGothic', fontSize: 7.5, lineHeight: 1.6, color: '#94A3B8', marginTop: 22 }}>
            본 리포트는 생년월일시와 MBTI 데이터를 기반으로 한 참고용 자료이며, 재물·건강·법률 등에 관한 최종 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          </Text>
        </View>
      </Page>

      {/* 목차 + 읽는 법: 고정 길이라 wrap={false} — 하단 여백만 넘쳐도 빈 페이지가 생기는 것을 막는다 */}
      <Page size="A4" style={styles.page} wrap={false}>
        <Text style={styles.sectionTitle}>목차</Text>
        {toc.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', paddingVertical: 5, borderBottom: '0.5pt solid #E2E8F0' }}>
            <Text style={{ width: 34, fontSize: 14, color: '#6366F1', fontWeight: 'bold' }}>{t.no || '★'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0F172A' }}>{t.title}</Text>
              <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>{t.desc}</Text>
            </View>
          </View>
        ))}

        <View style={[styles.box, { marginTop: 14, padding: 12 }]}>
          <Text style={[styles.boxTitle, { fontSize: 13, marginBottom: 6 }]}>이 리포트를 읽는 법</Text>
          <Text style={[styles.paragraph, { fontSize: 10.5, marginBottom: 5 }]}>• 이 리포트는 '나의 뼈대 → 지나온 길 → 지금의 고민 → 앞으로 3년'으로 이어지는 한 편의 이야기입니다. 바쁘시다면 「한눈에 보기」와 「마스터플랜」만 먼저 읽어도 핵심을 파악할 수 있습니다.</Text>
          <Text style={[styles.paragraph, { fontSize: 10.5, marginBottom: 5 }]}>• 점수·합충·월운은 만세력 계산값에 근거해 정해지며, 같은 생년월일시라면 언제 다시 보아도 같습니다.</Text>
          <Text style={[styles.paragraph, { fontSize: 10.5, marginBottom: 5 }]}>• 각 항목은 노란 상자의 '핵심 요약'으로 시작해 불릿으로 근거를 설명하고, 붉은 상자의 '실천 팁'으로 마무리됩니다.</Text>
          <Text style={[styles.paragraph, { fontSize: 10.5, marginBottom: 5 }]}>• 시기는 입춘(양력 2월 초)을 한 해의 시작으로 보는 절기 기준이며, 월별 표기는 양력 기준 '약 ○월경'입니다.</Text>
          <Text style={[styles.paragraph, { fontSize: 10.5, marginBottom: 0 }]}>• {c.currentYear ? `올해(${c.currentYear.year}년) 남은 기간과 ` : ''}내년부터의 3개년({range})을 다룹니다.</Text>
        </View>
        <Footer label="목차" />
      </Page>

      {/* 한눈에 보기 */}
      {c.summary && (
        <Page size="A4" style={[styles.page, { paddingBottom: '17mm' }]} wrap>
          <Text style={styles.sectionTitle}>한눈에 보기 · {range} 요약</Text>

          {c.summary.keywords && c.summary.keywords.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {c.summary.keywords.map((k, i) => (
                <Text key={i} style={{ fontSize: 11, color: '#4338CA', backgroundColor: '#EEF2FF', paddingVertical: 4, paddingHorizontal: 11, borderRadius: 12, fontWeight: 'bold' }}>#{k}</Text>
              ))}
            </View>
          )}

          {c.summary.verdict && (
            <View style={{ padding: 10, backgroundColor: '#0F172A', borderRadius: 10, marginBottom: 2 }}>
              <Text style={{ fontSize: 9, color: '#FBBF24', letterSpacing: 2, marginBottom: 4, fontWeight: 'bold' }}>MASTER'S VERDICT</Text>
              <Text style={{ fontSize: 11.5, color: '#F8FAFC', lineHeight: 1.65 }}>{c.summary.verdict}</Text>
            </View>
          )}

          {c.summary.concernAnswer && (
            <View wrap={false} style={{ padding: 8, backgroundColor: '#EEF2FF', borderRadius: 10, borderLeft: '4pt solid #6366F1', marginTop: 6 }}>
              <Text style={{ fontSize: 9, color: '#4338CA', fontWeight: 'bold', marginBottom: 3 }}>고민에 대한 한 줄 답</Text>
              <Text style={{ fontSize: 11.5, color: '#1E1B4B', fontWeight: 'bold', lineHeight: 1.55 }}>{c.summary.concernAnswer}</Text>
            </View>
          )}

          {c.summary.yearOverview && c.summary.yearOverview.length > 0 && (
            <View>
              <Text style={styles.subTitle}>3개년 운세 비교</Text>
              {c.summary.yearOverview.map(y => {
                const isBest = y.year === c.summary?.bestYear;
                const isCaution = y.year === c.summary?.cautionYear;
                return (
                  <View key={y.year} wrap={false} style={{ marginBottom: 3, padding: 5, borderRadius: 10, border: `0.75pt solid ${isBest ? '#10B981' : isCaution ? '#F59E0B' : '#E2E8F0'}`, backgroundColor: '#FFFFFF' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>{y.year}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginLeft: 6 }}>{y.ganji}년</Text>
                      {isBest && <Text style={{ fontSize: 9, color: '#047857', backgroundColor: '#D1FAE5', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8, marginLeft: 8, fontWeight: 'bold' }}>가장 좋은 해</Text>}
                      {isCaution && <Text style={{ fontSize: 9, color: '#B45309', backgroundColor: '#FEF3C7', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8, marginLeft: 8, fontWeight: 'bold' }}>신중하게 보낼 해</Text>}
                      {y.role ? <Text style={{ fontSize: 9, color: '#4338CA', backgroundColor: '#E0E7FF', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8, marginLeft: 8, fontWeight: 'bold' }}>{y.role}</Text> : null}
                    </View>
                    <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: '#4338CA', marginBottom: 4 }}>{y.yearlyTheme}</Text>
                    <ScoreGrid scores={y.scores} />
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={{ flex: 1, fontSize: 10, color: '#047857' }}>좋은 달  {formatMonths(y.bestMonths)}</Text>
                      <Text style={{ flex: 1, fontSize: 10, color: '#B45309' }}>조심할 달  {formatMonths(y.cautionMonths)}</Text>
                    </View>
                  </View>
                );
              })}
              <Text style={{ fontSize: 8.5, color: '#94A3B8' }}>※ 점수(1~5)는 일간 강약·용신, 십성, 합충, 12운성, 대운을 코드가 계산한 값입니다. 월은 절기월 기준 양력 약 ○월경입니다.</Text>
            </View>
          )}

          {c.summary.topActions && c.summary.topActions.length > 0 && (
            <View style={[styles.premiumBox, { marginTop: 6, padding: 8 }]} wrap={false}>
              <Text style={[styles.boxTitle, { fontSize: 12.5, color: '#1E293B', marginBottom: 4 }]}>지금 바로 시작할 3가지</Text>
              {c.summary.topActions.map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ width: 11, height: 11, border: '1pt solid #6366F1', borderRadius: 2, marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 11, color: '#334155' }}>{a}</Text>
                </View>
              ))}
            </View>
          )}
          <Footer label="한눈에 보기" />
        </Page>
      )}

      {/* 본문: 섹션이 이어서 흐른다 */}
      <Page size="A4" style={styles.page} wrap>
        {c.natalChartAnalysis && (
          <Section
            first={isFirst()}
            title={c.natalChartAnalysis.title}
            accent="#FBBF24"
            details={c.natalChartAnalysis.details}
            intro={(
              <View style={{ marginBottom: 10 }}>
                <Text style={[styles.subTitle, { borderLeftColor: '#FBBF24', marginTop: 0 }]} minPresenceAhead={300}>사주 원국 테이블 (四柱 元局)</Text>
                <DayMasterBox dayMaster={sajuData?.userSaju?.dayMaster} />
                <StrengthLine strength={c.strength} />
                <SajuTable saju={sajuData?.userSaju} />
                <FiveElementsChart elements={sajuData?.userSaju?.elementRatio} />
              </View>
            )}
          />
        )}

        {c.pastCheck && <Section first={isFirst()} title={c.pastCheck.title} accent="#0F766E" details={c.pastCheck.details} />}

        {c.specialRequestAnalysis && (
          <Section first={isFirst()} title={c.specialRequestAnalysis.title} accent="#4F46E5" details={c.specialRequestAnalysis.details} />
        )}

        <Footer label="나의 이야기" />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        {c.coreIdentity && <Section first title={c.coreIdentity.title} details={c.coreIdentity.details} />}
        {c.wealthAndCareer && <Section first={isFirst()} title={c.wealthAndCareer.title} accent="#0369A1" details={c.wealthAndCareer.details} />}
        {c.relationship && <Section first={isFirst()} title={c.relationship.title} accent="#BE185D" details={c.relationship.details} />}

        <Footer label="나의 이야기" />
      </Page>

      {/* 06. 3개년 로드맵: 연도마다 새 페이지 + 요약 배너 (연속 흐름에 이어 붙이면 react-pdf 레이아웃 오류가 나서 연도별 Page 로 분리) */}
      {/* 07. 올해 남은 기간 — 지나온 길과 앞으로 3년을 잇는 서막 */}
      {c.currentYear && (
        <YearPage
          y={c.currentYear}
          heading="07. 올해 남은 기간 — 서막"
          tag={`${c.currentYear.year}년 남은 기간`}
          footer="올해 남은 기간"
          partialNote={`${c.currentYear.year}년 남은 기간`}
        />
      )}

      {/* 08. 앞으로 3년의 이야기 — 개요(스토리 아크 + 36개월 지도)는 한 페이지, 이후 연도마다 새 페이지 */}
      {years.length > 0 && hasOverview && (
        <Page size="A4" style={styles.page} wrap>
          <Text style={styles.sectionTitle}>{c.threeYearRoadmap?.title || '08. 앞으로 3년의 이야기'}</Text>
          <ArcCard arc={c.storyArc} />
          <MonthHeatmap calendar={c.calendar} />
          <PartnerOverlap rows={c.partnerOverlap} name={c.partnerName} />
          <Footer label="앞으로 3년" />
        </Page>
      )}

      {years.map((y, index) => (
        <YearPage
          key={y.year || index}
          y={y}
          heading={index === 0 && !hasOverview && !c.currentYear ? (c.threeYearRoadmap?.title || '08. 앞으로 3년의 이야기') : undefined}
          tag={`${y.year}년`}
          footer={`${y.year}년 이야기`}
        />
      ))}

      {/* 07. 마스터플랜 */}
      {c.actionPlan && (
        <Page size="A4" style={styles.page} wrap>
          <Section first title={c.actionPlan.title} details={c.actionPlan.details}>
            <View style={styles.premiumBox} wrap={false}>
              <Text style={[styles.boxTitle, { color: '#1E293B' }]}>마스터의 최종 제언</Text>
              <Text style={styles.paragraph}>
                본 보고서는 당신의 선천적 기질과 후천적 운의 흐름을 정밀하게 분석한 결과입니다.
                위에서 제시한 현실적인 조언들을 생활 속에 적용하여, 타고난 운명을 넘어 당신이 원하는 최고의 성취를 이루시길 진심으로 기원합니다.
              </Text>
            </View>
            <View wrap={false} style={{ marginTop: 10, padding: 8, borderTop: '1.5pt solid #E2E8F0', alignItems: 'center' }}>
              <Text style={{ fontSize: 9.5, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6 }}>
                본 리포트는 생년월일시와 MBTI 데이터를 기반으로 한 참고용 상담 자료이며, 재물·건강·법률 등에 관한 최종적인 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
              </Text>
            </View>
          </Section>
          <Footer label="마스터플랜" />
        </Page>
      )}
    </Document>
  );
};
