import React, { forwardRef } from 'react';
import { stripMarkdown } from '../utils/textUtils';

interface TripPlace {
    name: string;
    reason: string;
    activity: string;
    photoSpot?: string;
    food?: string;
}

interface TripShareCardProps {
    result: {
        concept?: string;
        places?: TripPlace[];
        companion?: string;
        luckyItem?: string;
        summary?: string;
    };
    userName: string;
}

const truncateText = (text: string, maxLen: number): string => {
    const normalized = stripMarkdown(text).replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLen) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
};

const TripShareCard = forwardRef<HTMLDivElement, TripShareCardProps>(({ result, userName }, ref) => {
    const safeUserName = truncateText(userName || '사용자', 16) || '사용자';
    const safeConcept = truncateText(result?.concept || '행운의 여행지 추천', 38) || '행운의 여행지 추천';
    const places = Array.isArray(result?.places) ? result.places.filter(Boolean).slice(0, 3) : [];
    const safeCompanion = result?.companion ? truncateText(result.companion, 42) : '';
    const safeLuckyItem = result?.luckyItem ? truncateText(result.luckyItem, 42) : '';
    const hasBottomCards = Boolean(safeCompanion || safeLuckyItem);

    return (
        <div
            ref={ref}
            style={{
                width: '1000px',
                height: '1000px',
                padding: '56px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #E0F2FE 0%, #EFF6FF 50%, #E0E7FF 100%)',
                boxSizing: 'border-box',
                userSelect: 'none',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                color: '#0F172A',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '24px',
                    borderBottom: '2px solid #BAE6FD',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: '32px',
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            color: '#0F172A',
                            lineHeight: 1.1,
                        }}
                    >
                        MBTIJU
                    </h1>
                    <p
                        style={{
                            margin: 0,
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#334155',
                            letterSpacing: '0.18em',
                        }}
                    >
                        사주 × MBTI 행운 분석
                    </p>
                </div>
                <div>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px 18px',
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            lineHeight: 1.2,
                        }}
                    >
                        행운 여행지 분석
                    </span>
                </div>
            </div>

            {/* User Title & Concept */}
            <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '20px' }}>
                <h2
                    style={{
                        margin: '0 0 14px 0',
                        fontSize: '28px',
                        fontWeight: 900,
                        color: '#0F172A',
                        lineHeight: 1.25,
                    }}
                >
                    {safeUserName}님의 운명적 여행 테마
                </h2>
                <div
                    style={{
                        display: 'inline-block',
                        backgroundColor: '#FFFFFF',
                        border: '2px solid #BAE6FD',
                        borderRadius: '24px',
                        padding: '18px 32px',
                        maxWidth: '860px',
                        boxShadow: 'none',
                        boxSizing: 'border-box',
                    }}
                >
                    <p
                        style={{
                            margin: 0,
                            fontSize: '24px',
                            fontWeight: 900,
                            color: '#1E293B',
                            lineHeight: 1.38,
                            wordBreak: 'keep-all',
                        }}
                    >
                        "{safeConcept}"
                    </p>
                </div>
            </div>

            {/* Best Places (Grid) */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px',
                    width: '100%',
                }}
            >
                {places.map((place, idx) => {
                    const safeName = truncateText(place.name || '', 12);
                    const safeReason = truncateText(place.reason || '', 56);
                    const safePhotoSpot = truncateText(place.photoSpot || '핫플레이스', 16) || '핫플레이스';

                    return (
                        <div
                            key={idx}
                            style={{
                                backgroundColor: '#FFFFFF',
                                border: '2px solid #BAE6FD',
                                borderRadius: '28px',
                                padding: '24px',
                                boxShadow: 'none',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                height: '330px',
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        marginBottom: '16px',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '9999px',
                                            backgroundColor: '#0EA5E9',
                                            color: '#FFFFFF',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 900,
                                            fontSize: '14px',
                                            lineHeight: 1.2,
                                            flexShrink: 0,
                                        }}
                                    >
                                        0{idx + 1}
                                    </span>
                                    <h3
                                        style={{
                                            margin: 0,
                                            fontSize: '19px',
                                            fontWeight: 900,
                                            color: '#0F172A',
                                            lineHeight: 1.42,
                                            paddingBottom: '4px',
                                            wordBreak: 'keep-all',
                                        }}
                                    >
                                        {safeName}
                                    </h3>
                                </div>
                                <p
                                    style={{
                                        margin: '0 0 8px 0',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#64748B',
                                        letterSpacing: '0.06em',
                                    }}
                                >
                                    추천 이유
                                </p>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: '#334155',
                                        lineHeight: 1.42,
                                        paddingBottom: '4px',
                                        wordBreak: 'keep-all',
                                    }}
                                >
                                    {safeReason}
                                </p>
                            </div>

                            <div
                                style={{
                                    marginTop: '14px',
                                    paddingTop: '14px',
                                    borderTop: '1px solid #E2E8F0',
                                }}
                            >
                                <p
                                    style={{
                                        margin: '0 0 4px 0',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: '#0284C7',
                                        letterSpacing: '0.08em',
                                    }}
                                >
                                    인생샷 스팟
                                </p>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#1E293B',
                                        lineHeight: 1.35,
                                        wordBreak: 'keep-all',
                                    }}
                                >
                                    {safePhotoSpot}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Companion & Lucky Item */}
            {hasBottomCards && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: safeCompanion && safeLuckyItem ? 'repeat(2, 1fr)' : '1fr',
                        gap: '20px',
                        marginTop: '20px',
                    }}
                >
                    {safeCompanion && (
                        <div
                            style={{
                                backgroundColor: '#0F172A',
                                color: '#FFFFFF',
                                padding: '22px 24px',
                                borderRadius: '24px',
                                boxShadow: 'none',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#38BDF8',
                                    letterSpacing: '0.08em',
                                    marginBottom: '6px',
                                }}
                            >
                                최고의 여행 메이트
                            </span>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: '#FFFFFF',
                                    lineHeight: 1.4,
                                    wordBreak: 'keep-all',
                                }}
                            >
                                {safeCompanion}
                            </p>
                        </div>
                    )}
                    {safeLuckyItem && (
                        <div
                            style={{
                                backgroundColor: '#FFFFFF',
                                border: '2px solid #C7D2FE',
                                padding: '22px 24px',
                                borderRadius: '24px',
                                boxShadow: 'none',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#4F46E5',
                                    letterSpacing: '0.08em',
                                    marginBottom: '6px',
                                }}
                            >
                                행운의 아이템
                            </span>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: '#0F172A',
                                    lineHeight: 1.4,
                                    wordBreak: 'keep-all',
                                }}
                            >
                                {safeLuckyItem}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Watermark */}
            <div
                style={{
                    marginTop: '20px',
                    paddingTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                }}
            >
                <div style={{ width: '64px', height: '1px', backgroundColor: '#475569' }} />
                <span
                    style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#475569',
                        letterSpacing: '0.35em',
                    }}
                >
                    MBTIJU 맞춤 리포트
                </span>
                <div style={{ width: '64px', height: '1px', backgroundColor: '#475569' }} />
            </div>
        </div>
    );
});

TripShareCard.displayName = 'TripShareCard';

export default TripShareCard;
