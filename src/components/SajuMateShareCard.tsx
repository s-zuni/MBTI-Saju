import React, { forwardRef } from 'react';
import { getSajuMateById } from '../config/sajuMateConfig';
import { stripMarkdown } from '../utils/textUtils';

interface SajuMateShareCardProps {
  userName: string;
  dayPillarText?: string | undefined;
  mbti?: string | undefined;
  result: {
    headline?: string;
    bestCharacterId?: string;
    worstCharacterId?: string;
    mirrorCharacterId?: string;
    bestScore?: number;
    worstAlertScore?: number;
    bestMatch?: {
      chemistryTitle?: string;
    };
    worstMatch?: {
      warningTitle?: string;
    };
    luckyItem?: {
      item?: string;
      color?: string;
    };
  };
}

function truncateText(text: string, maxLen: number): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
}

function extractShortLucky(color?: string, item?: string): string {
  const src = (color || item || '따뜻한 파스텔 톤').replace(/\s+/g, ' ').trim();
  const firstPart = src.split(/[.·,\n]/)[0]?.trim() || src;
  return truncateText(firstPart, 22);
}

const SajuMateShareCard = forwardRef<HTMLDivElement, SajuMateShareCardProps>(
  ({ userName, dayPillarText, mbti, result }, ref) => {
    const bestChar = getSajuMateById(result.bestCharacterId);
    const worstChar = getSajuMateById(result.worstCharacterId);
    const mirrorChar = getSajuMateById(result.mirrorCharacterId);

    const bestScore = result.bestScore || 92;
    const worstAlertScore = result.worstAlertScore || 86;
    const cleanMbti = mbti && mbti !== '미입력' ? mbti.toUpperCase() : '';
    const headline = truncateText(
      stripMarkdown(result.headline) || '내 사주가 끌어당기는 찰떡 메이트 & 상극 경보',
      34
    );
    const bestChemistryTitle = truncateText(
      stripMarkdown(result.bestMatch?.chemistryTitle) || bestChar.tagline,
      26
    );
    const worstWarningTitle = truncateText(
      stripMarkdown(result.worstMatch?.warningTitle) || '함께 있으면 감정 배터리 방전 주의',
      26
    );
    const luckySummary = extractShortLucky(
      stripMarkdown(result.luckyItem?.color),
      stripMarkdown(result.luckyItem?.item)
    );

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1920px',
          padding: '120px 56px 130px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #FFF7F5 0%, #FDF4FF 52%, #F0F9FF 100%)',
          fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '32px',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#0F172A',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              MBTIJU
            </p>
            <p
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#64748B',
                letterSpacing: '0.12em',
                marginTop: '8px',
                marginBottom: 0,
                lineHeight: 1.3,
              }}
            >
              말랑 사주 메이트 궁합 리포트
            </p>
          </div>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #FECDD3',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              lineHeight: 1.2,
              fontSize: '22px',
              fontWeight: 900,
              color: '#E11D48',
            }}
          >
            {dayPillarText || '사주 원국'}
            {cleanMbti ? ` · ${cleanMbti}` : ''}
          </div>
        </div>

        {/* Main Title */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '20px',
            marginBottom: '20px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          <p
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#7C3AED',
              lineHeight: 1.4,
              paddingBottom: '4px',
              marginTop: 0,
              marginBottom: '8px',
            }}
          >
            {userName}님의 사주 × MBTI 캐릭터 궁합
          </p>
          <h2
            style={{
              fontSize: '44px',
              fontWeight: 900,
              color: '#0F172A',
              lineHeight: 1.35,
              paddingBottom: '6px',
              wordBreak: 'keep-all',
              margin: 0,
            }}
          >
            {headline}
          </h2>
        </div>

        {/* Best vs Worst Match Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
          }}
        >
          {/* Best Match Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '3px solid #A7F3D0',
              borderRadius: '44px',
              padding: '36px 28px',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 22px',
                borderRadius: '9999px',
                lineHeight: 1.2,
                backgroundColor: '#D1FAE5',
                color: '#065F46',
                fontSize: '22px',
                fontWeight: 900,
                marginBottom: '20px',
              }}
            >
              최고의 찰떡 메이트
            </span>
            <div
              style={{
                width: '320px',
                height: '320px',
                borderRadius: '36px',
                backgroundColor: '#FFFFFF',
                border: '2px solid #ECFDF5',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            >
              <img
                src={bestChar.imagePath}
                alt={bestChar.name}
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <p
              style={{
                fontSize: '42px',
                fontWeight: 900,
                color: '#0F172A',
                lineHeight: 1.3,
                paddingBottom: '4px',
                margin: 0,
              }}
            >
              {bestChar.name}
            </p>
            <p
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#64748B',
                lineHeight: 1.4,
                wordBreak: 'keep-all',
                marginTop: '4px',
                marginBottom: 0,
              }}
            >
              {bestChar.subtitle}
            </p>
            <div
              style={{
                marginTop: '20px',
                backgroundColor: '#ECFDF5',
                border: '2px solid #A7F3D0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '12px 24px',
                borderRadius: '20px',
                lineHeight: 1.2,
              }}
            >
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#047857' }}>궁합 지수</span>
              <span style={{ fontSize: '38px', fontWeight: 900, color: '#059669' }}>{bestScore}점</span>
            </div>
            <p
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#1E293B',
                lineHeight: 1.45,
                paddingBottom: '4px',
                marginTop: '20px',
                marginBottom: 0,
                wordBreak: 'keep-all',
              }}
            >
              "{bestChemistryTitle}"
            </p>
          </div>

          {/* Worst Match Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '3px solid #FECDD3',
              borderRadius: '44px',
              padding: '36px 28px',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 22px',
                borderRadius: '9999px',
                lineHeight: 1.2,
                backgroundColor: '#FFE4E6',
                color: '#BE123C',
                fontSize: '22px',
                fontWeight: 900,
                marginBottom: '20px',
              }}
            >
              피해야 할 상극 메이트
            </span>
            <div
              style={{
                width: '320px',
                height: '320px',
                borderRadius: '36px',
                backgroundColor: '#FFFFFF',
                border: '2px solid #FFF1F2',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            >
              <img
                src={worstChar.imagePath}
                alt={worstChar.name}
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <p
              style={{
                fontSize: '42px',
                fontWeight: 900,
                color: '#0F172A',
                lineHeight: 1.3,
                paddingBottom: '4px',
                margin: 0,
              }}
            >
              {worstChar.name}
            </p>
            <p
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#64748B',
                lineHeight: 1.4,
                wordBreak: 'keep-all',
                marginTop: '4px',
                marginBottom: 0,
              }}
            >
              {worstChar.subtitle}
            </p>
            <div
              style={{
                marginTop: '20px',
                backgroundColor: '#FFF1F2',
                border: '2px solid #FECDD3',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '12px 24px',
                borderRadius: '20px',
                lineHeight: 1.2,
              }}
            >
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#BE123C' }}>상극 경보</span>
              <span style={{ fontSize: '38px', fontWeight: 900, color: '#E11D48' }}>{worstAlertScore}%</span>
            </div>
            <p
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#1E293B',
                lineHeight: 1.45,
                paddingBottom: '4px',
                marginTop: '20px',
                marginBottom: 0,
                wordBreak: 'keep-all',
              }}
            >
              "{worstWarningTitle}"
            </p>
          </div>
        </div>

        {/* Bottom Mirror Character + Lucky Strip */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '3px solid #DDD6FE',
            borderRadius: '36px',
            padding: '28px 32px',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '9999px',
                backgroundColor: '#F5F3FF',
                border: '2px solid #DDD6FE',
                padding: '10px',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <img
                src={mirrorChar.imagePath}
                alt={mirrorChar.name}
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p
                style={{
                  fontSize: '19px',
                  fontWeight: 900,
                  color: '#7C3AED',
                  lineHeight: 1.3,
                  marginTop: 0,
                  marginBottom: '4px',
                }}
              >
                내 사주 속 숨은 본캐 메이트
              </p>
              <p
                style={{
                  fontSize: '34px',
                  fontWeight: 900,
                  color: '#0F172A',
                  lineHeight: 1.25,
                  margin: 0,
                }}
              >
                {mirrorChar.name}
              </p>
              <p
                style={{
                  fontSize: '19px',
                  fontWeight: 700,
                  color: '#64748B',
                  lineHeight: 1.35,
                  paddingBottom: '4px',
                  marginTop: '4px',
                  marginBottom: 0,
                }}
              >
                {mirrorChar.elementBadge}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', maxWidth: '380px' }}>
            <p
              style={{
                fontSize: '19px',
                fontWeight: 900,
                color: '#D97706',
                lineHeight: 1.3,
                marginTop: 0,
                marginBottom: '6px',
              }}
            >
              내 사주 행운 부스터
            </p>
            <p
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#0F172A',
                lineHeight: 1.45,
                wordBreak: 'keep-all',
                margin: 0,
              }}
            >
              {luckySummary}
            </p>
          </div>
        </div>

        {/* Footer Watermark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '24px',
            borderTop: '2px solid #E2E8F0',
          }}
        >
          <span
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#64748B',
              lineHeight: 1.3,
            }}
          >
            나도 내 찰떡 · 상극 메이트 찾기
          </span>
          <span
            style={{
              fontSize: '26px',
              fontWeight: 900,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
            }}
          >
            www.mbtiju.com/mate
          </span>
        </div>
      </div>
    );
  }
);

SajuMateShareCard.displayName = 'SajuMateShareCard';

export default SajuMateShareCard;
