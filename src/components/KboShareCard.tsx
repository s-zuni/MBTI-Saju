import React, { forwardRef } from 'react';
import { getTeamInfo } from '../config/teamConfig';
import { stripMarkdown } from '../utils/textUtils';

interface KboShareCardProps {
    result: {
        score: number;
        winFairyScore: number;
        recommendedSeat: string;
        luckyFood: string;
    };
    selectedTeam: string;
    userName: string;
}

const truncateText = (text: string, maxLen: number): string => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLen) return normalized;
    return `${normalized.slice(0, maxLen - 1).trimEnd()}…`;
};

const KboShareCard = forwardRef<HTMLDivElement, KboShareCardProps>(({ result, selectedTeam, userName }, ref) => {
    const teamInfo = getTeamInfo(selectedTeam);
    const primaryColor = teamInfo?.primaryColor || '#0F172A';

    // score와 winFairyScore가 스트리밍 중인 경우를 대비해 기본값 설정
    const score = typeof result.score === 'number' ? result.score : 0;
    const winFairyScore = typeof result.winFairyScore === 'number' ? result.winFairyScore : 0;
    const safeUserName = truncateText(stripMarkdown(userName || '사용자'), 10) || '사용자';
    const safeLuckySeat = truncateText(stripMarkdown(result.recommendedSeat || ''), 36) || '-';
    const safeLuckyFood = truncateText(stripMarkdown(result.luckyFood || ''), 36) || '-';

    return (
        <div
            ref={ref}
            style={{
                position: 'relative',
                width: '1000px',
                height: '1000px',
                backgroundColor: '#FFFFFF',
                padding: '64px 72px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                userSelect: 'none',
                overflow: 'hidden',
                fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
        >
            {/* Top Accent Bar */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '10px',
                    backgroundColor: primaryColor,
                }}
            />

            {/* Top Header Section */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    paddingTop: '8px',
                }}
            >
                <div>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: '36px',
                            fontWeight: 900,
                            letterSpacing: '-0.04em',
                            lineHeight: 1.15,
                            color: '#0F172A',
                        }}
                    >
                        MBTIJU
                    </h1>
                    <p
                        style={{
                            margin: '6px 0 0 0',
                            fontSize: '13px',
                            fontWeight: 700,
                            letterSpacing: '0.2em',
                            lineHeight: 1.4,
                            color: '#64748B',
                        }}
                    >
                        정교한 사주 분석 리포트
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p
                        style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: 800,
                            letterSpacing: '0.16em',
                            lineHeight: 1.4,
                            color: '#64748B',
                        }}
                    >
                        KBO 팬 · 운명 리포트
                    </p>
                </div>
            </div>

            {/* Main Title Section */}
            <div style={{ marginTop: '36px', marginBottom: '24px' }}>
                <p
                    style={{
                        margin: '0 0 24px 0',
                        fontSize: '18px',
                        fontWeight: 800,
                        letterSpacing: '0.35em',
                        lineHeight: 1.4,
                        color: primaryColor,
                    }}
                >
                    분석 기록
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: safeUserName.length > 6 ? '56px' : '68px',
                            fontWeight: 500,
                            lineHeight: 1.2,
                            letterSpacing: '-0.02em',
                            color: '#0F172A',
                            fontFamily: "'Noto Serif KR', serif",
                            wordBreak: 'keep-all',
                        }}
                    >
                        {safeUserName}님의
                    </h2>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: selectedTeam.length > 8 ? '68px' : '78px',
                            fontWeight: 700,
                            lineHeight: 1.22,
                            letterSpacing: '-0.02em',
                            color: primaryColor,
                            paddingBottom: '6px',
                            fontFamily: "'Noto Serif KR', serif",
                            wordBreak: 'keep-all',
                        }}
                    >
                        {selectedTeam} 궁합
                    </h2>
                </div>
            </div>

            {/* Bottom Data Section */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '5fr 4fr 3fr',
                    gap: '28px',
                    alignItems: 'end',
                    paddingTop: '24px',
                    borderTop: '1px solid #E2E8F0',
                }}
            >
                {/* Compatibility Score */}
                <div>
                    <p
                        style={{
                            margin: '0 0 16px 0',
                            fontSize: '18px',
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            lineHeight: 1.4,
                            color: '#64748B',
                        }}
                    >
                        궁합 지수
                    </p>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                        <span
                            style={{
                                fontSize: '148px',
                                fontWeight: 700,
                                lineHeight: 1.05,
                                letterSpacing: '-0.04em',
                                color: primaryColor,
                                paddingBottom: '4px',
                            }}
                        >
                            {score}
                        </span>
                        <span
                            style={{
                                fontSize: '34px',
                                fontWeight: 700,
                                lineHeight: 1.2,
                                color: '#64748B',
                                marginLeft: '6px',
                            }}
                        >
                            점
                        </span>
                    </div>
                </div>

                {/* Victory Fairy Probability & Lucky Seat */}
                <div>
                    <p
                        style={{
                            margin: '0 0 12px 0',
                            fontSize: '18px',
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            lineHeight: 1.4,
                            color: '#64748B',
                        }}
                    >
                        승리 요정 확률
                    </p>
                    <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '28px' }}>
                        <span
                            style={{
                                fontSize: '88px',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                color: '#0F172A',
                            }}
                        >
                            {winFairyScore}
                        </span>
                        <span
                            style={{
                                fontSize: '30px',
                                fontWeight: 600,
                                lineHeight: 1.2,
                                color: '#64748B',
                                marginLeft: '6px',
                            }}
                        >
                            %
                        </span>
                    </div>

                    <div>
                        <p
                            style={{
                                margin: '0 0 8px 0',
                                fontSize: '18px',
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                lineHeight: 1.4,
                                color: primaryColor,
                            }}
                        >
                            행운의 자리
                        </p>
                        <p
                            style={{
                                margin: 0,
                                fontSize: '20px',
                                fontWeight: 700,
                                lineHeight: 1.45,
                                paddingBottom: '4px',
                                color: '#1E293B',
                                wordBreak: 'keep-all',
                            }}
                        >
                            {safeLuckySeat}
                        </p>
                    </div>
                </div>

                {/* Lucky Food */}
                <div>
                    <p
                        style={{
                            margin: '0 0 8px 0',
                            fontSize: '18px',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            lineHeight: 1.4,
                            color: '#64748B',
                        }}
                    >
                        행운의 음식
                    </p>
                    <p
                        style={{
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: 700,
                            lineHeight: 1.45,
                            paddingBottom: '4px',
                            color: '#1E293B',
                            wordBreak: 'keep-all',
                        }}
                    >
                        {safeLuckyFood}
                    </p>
                </div>
            </div>

            {/* Bottom Watermark */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '12px',
                    paddingTop: '16px',
                }}
            >
                <div style={{ width: '40px', height: '1px', backgroundColor: '#64748B' }} />
                <span
                    style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.28em',
                        lineHeight: 1.4,
                        color: '#64748B',
                    }}
                >
                    MBTIJU 특별 리포트
                </span>
            </div>
        </div>
    );
});

export default KboShareCard;
