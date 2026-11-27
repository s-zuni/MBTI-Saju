import React, { forwardRef } from 'react';
import { Moon } from 'lucide-react';
import { stripMarkdown } from '../utils/textUtils';

interface TarotShareCardProps {
    reading: {
        cardReadings?: Array<{
            cardName: string;
            interpretation: string;
        }>;
        overallReading?: string;
        advice?: string;
    };
    question: string;
    userName: string;
    cardImages?: Array<string | undefined>;
}

function truncateText(text: string, maxLen: number): string {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
}

const TarotShareCard = forwardRef<HTMLDivElement, TarotShareCardProps>(
    ({ reading, question, userName, cardImages = [] }, ref) => {
        const cardReadings = Array.isArray(reading?.cardReadings)
            ? reading.cardReadings.filter(Boolean).slice(0, 3)
            : [];
        const safeUserName = stripMarkdown(userName || '').trim() || '사용자';
        const safeQuestion = truncateText(
            stripMarkdown(question || '') || '오늘 하루의 흐름과 조언',
            44
        );
        const safeAdvice = truncateText(stripMarkdown(reading?.advice || ''), 92);

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
                    background: 'linear-gradient(135deg, #090D1F 0%, #1E1B4B 52%, #0F172A 100%)',
                    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: '20px',
                        borderBottom: '1px solid #312E81',
                    }}
                >
                    <div>
                        <h1
                            style={{
                                fontSize: '32px',
                                fontWeight: 900,
                                letterSpacing: '-0.02em',
                                color: '#FFFFFF',
                                lineHeight: 1.1,
                                margin: 0,
                            }}
                        >
                            MBTIJU
                        </h1>
                        <p
                            style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#A78BFA',
                                letterSpacing: '0.18em',
                                marginTop: '6px',
                                marginBottom: 0,
                                lineHeight: 1.2,
                            }}
                        >
                            운명의 타로 오라클
                        </p>
                    </div>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px 18px',
                            backgroundColor: '#2E1065',
                            border: '2px solid #7C3AED',
                            color: '#EDE9FE',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            lineHeight: 1,
                        }}
                    >
                        타로 리딩 결과
                    </span>
                </div>

                {/* User Question */}
                <div style={{ textAlign: 'center' }}>
                    <p
                        style={{
                            fontSize: '17px',
                            fontWeight: 700,
                            color: '#C4B5FD',
                            margin: '0 0 10px 0',
                            lineHeight: 1.3,
                        }}
                    >
                        {safeUserName}님의 고민
                    </p>
                    <div
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#131836',
                            border: '1px solid #4C1D95',
                            borderRadius: '20px',
                            padding: '16px 28px',
                            boxShadow: 'none',
                            maxWidth: '820px',
                            boxSizing: 'border-box',
                        }}
                    >
                        <p
                            style={{
                                fontSize: '22px',
                                fontWeight: 800,
                                color: '#FFFFFF',
                                lineHeight: 1.45,
                                paddingBottom: '4px',
                                margin: 0,
                                wordBreak: 'keep-all',
                            }}
                        >
                            "{safeQuestion}"
                        </p>
                    </div>
                </div>

                {/* Selected Cards */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'stretch',
                        gap: '24px',
                    }}
                >
                    {cardReadings.map((card, idx) => {
                        const safeCardName = truncateText(stripMarkdown(card.cardName || ''), 16);
                        return (
                            <div
                                key={idx}
                                style={{
                                    width: '240px',
                                    backgroundColor: '#131836',
                                    border: '1px solid #4C1D95',
                                    borderRadius: '24px',
                                    padding: '20px 18px',
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
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        color: '#C4B5FD',
                                        letterSpacing: '0.08em',
                                        marginBottom: '12px',
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {idx + 1}번 카드
                                </span>

                                {cardImages[idx] ? (
                                    <img
                                        src={cardImages[idx]}
                                        alt={safeCardName}
                                        crossOrigin="anonymous"
                                        style={{
                                            width: '140px',
                                            height: '210px',
                                            objectFit: 'cover',
                                            borderRadius: '14px',
                                            border: '1px solid #6D28D9',
                                            marginBottom: '14px',
                                            display: 'block',
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '140px',
                                            height: '210px',
                                            background: 'linear-gradient(135deg, #0F172A 0%, #3B0764 50%, #0F172A 100%)',
                                            borderRadius: '14px',
                                            border: '1px solid #6D28D9',
                                            marginBottom: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <Moon size={32} color="#A78BFA" />
                                    </div>
                                )}

                                <h3
                                    style={{
                                        fontSize: '18px',
                                        fontWeight: 800,
                                        color: '#FFFFFF',
                                        lineHeight: 1.35,
                                        paddingBottom: '4px',
                                        margin: 0,
                                        wordBreak: 'keep-all',
                                    }}
                                >
                                    {safeCardName}
                                </h3>
                            </div>
                        );
                    })}
                </div>

                {/* Practical Advice Guide */}
                {safeAdvice && (
                    <div
                        style={{
                            backgroundColor: '#1A1D3D',
                            border: '1px solid #4338CA',
                            borderRadius: '20px',
                            padding: '18px 28px',
                            boxShadow: 'none',
                            textAlign: 'center',
                            maxWidth: '780px',
                            width: '100%',
                            margin: '0 auto',
                            boxSizing: 'border-box',
                        }}
                    >
                        <span
                            style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 800,
                                color: '#FBBF24',
                                letterSpacing: '0.12em',
                                marginBottom: '6px',
                                lineHeight: 1.2,
                            }}
                        >
                            실천 가이드
                        </span>
                        <p
                            style={{
                                fontSize: '16px',
                                fontWeight: 700,
                                color: '#E0E7FF',
                                lineHeight: 1.48,
                                paddingBottom: '4px',
                                margin: 0,
                                wordBreak: 'keep-all',
                            }}
                        >
                            "{safeAdvice}"
                        </p>
                    </div>
                )}

                {/* Watermark */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                    }}
                >
                    <div
                        style={{
                            width: '64px',
                            height: '1px',
                            backgroundColor: '#64748B',
                        }}
                    />
                    <span
                        style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: '#A78BFA',
                            letterSpacing: '0.32em',
                        }}
                    >
                        MBTIJU 타로 리딩
                    </span>
                    <div
                        style={{
                            width: '64px',
                            height: '1px',
                            backgroundColor: '#64748B',
                        }}
                    />
                </div>
            </div>
        );
    }
);

TarotShareCard.displayName = 'TarotShareCard';

export default TarotShareCard;
