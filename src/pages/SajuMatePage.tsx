import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Heart,
  ShieldAlert,
  Lock,
  CreditCard,
  Loader2,
  Instagram,
  Share2,
  RotateCcw,
  ChevronLeft,
  CheckCircle2,
  Wand2,
  Palette,
  Gift,
  Users,
} from 'lucide-react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { sajuMateSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import {
  SAJU_MATE_CHARACTERS,
  ELEMENT_LABELS,
  calculateSajuMateMatch,
  calculateSajuMateTeaser,
  calculateFriendMateChemistry,
  getSajuMateById,
  isValidSajuMateId,
  normalizeMbtiInput,
  FiveElementKey,
} from '../config/sajuMateConfig';
import { safeCalculateSaju } from '../utils/sajuUtils';
import { stripMarkdown } from '../utils/textUtils';
import { generateImage } from '../utils/exportUtils';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from '../components/GuestProfileCard';
import SajuGrid from '../components/saju/SajuGrid';
import FunnelBottomCta from '../components/FunnelBottomCta';
import SajuMateShareCard from '../components/SajuMateShareCard';
import ReportErrorBoundary from '../components/common/ReportErrorBoundary';
import StreamingStatusBanner from '../components/common/StreamingStatusBanner';
import {
  buildServiceRequestHeaders,
  consumePaidServiceTicket,
  startServicePayment,
} from '../utils/servicePayCheckout';
import { track, trackOnce } from '../utils/analytics';

const GUEST_SAJU_MATE_RESULT_KEY = 'mbtiju_guest_saju_mate_result';

const MATE_LOADING_MESSAGES = [
  '당신의 만세력 4주 8자와 9종 말랑 메이트의 기운을 대조하고 있어요...',
  '부족한 오행을 포근하게 채워줄 찰떡 단짝을 찾는 중입니다...',
  '함께 있으면 감정 배터리가 방전될 상극 경보 메이트를 판독하고 있어요...',
  '내 사주 속에 숨어 있던 본캐 메이트의 정체를 꺼내는 중입니다...',
];

const MateRadarChart = ({ data }: { data: Array<{ label?: string | undefined; value?: number | undefined } | undefined> }) => {
  const valid = Array.isArray(data)
    ? data.filter(
        (d): d is { label: string; value: number } =>
          Boolean(d && typeof d.label === 'string' && typeof d.value === 'number' && !Number.isNaN(d.value))
      )
    : [];
  if (valid.length < 3) return null;

  const cx = 150;
  const cy = 150;
  const radius = 92;
  const total = valid.length;

  const getPoint = (index: number, val: number, r: number) => {
    const clamped = Math.min(100, Math.max(0, Number(val) || 0));
    const angle = (index * (360 / total) - 90) * (Math.PI / 180);
    return {
      x: cx + r * (clamped / 100) * Math.cos(angle),
      y: cy + r * (clamped / 100) * Math.sin(angle),
    };
  };

  const gridLevels = [25, 50, 75, 100];
  const gridPaths = gridLevels.map((level) =>
    Array.from({ length: total })
      .map((_, i) => getPoint(i, 100, level * (radius / 100)))
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ') + ' Z'
  );
  const outerPoints = Array.from({ length: total }).map((_, i) => getPoint(i, 100, radius));
  const dataPoints = valid.map((d, i) => getPoint(i, d.value || 0, radius));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <svg viewBox="0 0 300 300" className="w-full max-w-[280px] h-auto overflow-visible">
        {gridPaths.map((d, idx) => (
          <path key={idx} d={d} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {outerPoints.map((p, idx) => (
          <line key={idx} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1" />
        ))}
        <path d={dataPath} fill="rgba(244, 63, 94, 0.14)" stroke="#e11d48" strokeWidth="2.5" />
        {dataPoints.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#e11d48" />
        ))}
        {outerPoints.map((_, idx) => {
          const angle = (idx * (360 / total) - 90) * (Math.PI / 180);
          const lx = cx + (radius + 34) * Math.cos(angle);
          const ly = cy + (radius + 22) * Math.sin(angle);
          let anchor: 'start' | 'middle' | 'end' = 'middle';
          if (Math.cos(angle) > 0.15) anchor = 'start';
          else if (Math.cos(angle) < -0.15) anchor = 'end';
          return (
            <g key={idx}>
              <text x={lx} y={ly} textAnchor={anchor} className="text-[11px] font-bold fill-slate-600">
                {valid[idx]?.label}
              </text>
              <text x={lx} y={ly + 14} textAnchor={anchor} className="text-[11px] font-black fill-rose-600">
                {valid[idx]?.value}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// 결제 전 실루엣 티저용 오행별 동물 실루엣 SVG (실제 캐릭터 정체는 비노출)
const MysterySilhouetteSvg: React.FC<{ variant: 'best' | 'worst'; element?: FiveElementKey }> = ({
  variant,
  element = 'wood',
}) => {
  const gradId = `sil-${variant}-${element}`;
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24 mx-auto drop-shadow-sm" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={variant === 'best' ? '#a7f3d0' : '#fecdd3'} />
          <stop offset="100%" stopColor={variant === 'best' ? '#34d399' : '#fb7185'} />
        </linearGradient>
      </defs>
      {element === 'fire' && (
        <>
          <polygon points="30,52 24,14 52,38" fill={`url(#${gradId})`} opacity="0.88" />
          <polygon points="90,52 96,14 68,38" fill={`url(#${gradId})`} opacity="0.88" />
          <path d="M92 78 C110 70 112 94 94 96 Z" fill={`url(#${gradId})`} opacity="0.7" />
        </>
      )}
      {element === 'wood' && (
        <>
          <circle cx="38" cy="34" r="14" fill={`url(#${gradId})`} opacity="0.85" />
          <circle cx="82" cy="34" r="14" fill={`url(#${gradId})`} opacity="0.85" />
          <ellipse cx="60" cy="24" rx="5" ry="10" transform="rotate(-20 60 24)" fill={`url(#${gradId})`} opacity="0.75" />
        </>
      )}
      {element === 'earth' && (
        <>
          <ellipse cx="34" cy="38" rx="14" ry="12" fill={`url(#${gradId})`} opacity="0.85" />
          <ellipse cx="86" cy="38" rx="14" ry="12" fill={`url(#${gradId})`} opacity="0.85" />
        </>
      )}
      {element === 'metal' && (
        <>
          <path d="M26 42 Q26 18 46 32 Z" fill={`url(#${gradId})`} opacity="0.88" />
          <path d="M94 42 Q94 18 74 32 Z" fill={`url(#${gradId})`} opacity="0.88" />
          <path d="M22 64 Q10 54 18 76 Z" fill={`url(#${gradId})`} opacity="0.65" />
          <path d="M98 64 Q110 54 102 76 Z" fill={`url(#${gradId})`} opacity="0.65" />
        </>
      )}
      {element === 'water' && (
        <>
          <ellipse cx="26" cy="74" rx="12" ry="7" transform="rotate(-25 26 74)" fill={`url(#${gradId})`} opacity="0.75" />
          <ellipse cx="94" cy="74" rx="12" ry="7" transform="rotate(25 94 74)" fill={`url(#${gradId})`} opacity="0.75" />
        </>
      )}
      <ellipse cx="60" cy="68" rx="35" ry="33" fill={`url(#${gradId})`} opacity="0.92" />
      <text
        x="60"
        y="78"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="32"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        ?
      </text>
    </svg>
  );
};

const SajuMatePage: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded = false }) => {
  const { profile, updateProfile } = useGuestProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const shareRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const ticketCheckedRef = useRef(false);
  const autoPreviewAppliedRef = useRef(false);
  const resultTrackedRef = useRef(false);
  const receiptTokenRef = useRef<string | null>(null);
  const lastPayloadRef = useRef<any>(null);

  const friendFromName = (searchParams.get('fromName') || '').trim().slice(0, 12);
  const rawFriendMirror = (searchParams.get('mirror') || '').trim();
  const friendChar = useMemo(
    () => (friendFromName && isValidSajuMateId(rawFriendMirror) ? getSajuMateById(rawFriendMirror) : null),
    [friendFromName, rawFriendMirror]
  );

  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [savedResult, setSavedResult] = useState<any>(null);
  const [recoveredReceiptToken, setRecoveredReceiptToken] = useState<string | null>(null);
  const [activeMeta, setActiveMeta] = useState<{
    name: string;
    birthDate: string;
    birthTime?: string;
    gender?: string;
    mbti?: string;
  } | null>(null);

  const userName = profile.name?.trim() || '이용자';

  useEffect(() => {
    trackOnce('saju_mate_landing_view', {
      embedded: isEmbedded,
      fromFriend: Boolean(friendChar),
    });
  }, [isEmbedded, friendChar]);

  const calculatedSaju = useMemo(() => {
    if (!profile.birthDate) return null;
    return safeCalculateSaju(profile.birthDate, profile.birthTime, profile.gender);
  }, [profile.birthDate, profile.birthTime, profile.gender]);

  const teaserInfo = useMemo(() => {
    if (!calculatedSaju) return null;
    return calculateSajuMateTeaser({
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      gender: profile.gender,
      mbti: normalizeMbtiInput(profile.mbti),
      dayMasterKorean: calculatedSaju.dayMaster.korean,
      elementRatio: calculatedSaju.elementRatio,
    });
  }, [calculatedSaju, profile.birthDate, profile.birthTime, profile.gender, profile.mbti]);

  const { object: result, submit, isLoading } = useObject({
    api: '/api/analysis-special',
    schema: sajuMateSchema,
    headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
    onFinish: ({ object }) => {
      if (!object) {
        setGenError('분석 결과를 완성하지 못했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
      } else {
        setGenError(null);
      }
    },
    onError: (err) => {
      console.error('[SajuMatePage] AI Error:', err);
      track('saju_mate_error');
      setGenError('분석 중 일시적인 오류가 발생했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
    },
  });

  // 결제 완료 후 복귀 시 단건 티켓 자동 소비 & 결과 생성 (폴백 및 새로고침 결과 보존 포함)
  useEffect(() => {
    if (ticketCheckedRef.current) return;
    ticketCheckedRef.current = true;
    const ticket = consumePaidServiceTicket('SAJU_MATE');
    if (ticket) {
      receiptTokenRef.current = ticket.receiptToken || null;
      if (ticket.payload) {
        const meta = {
          name: ticket.payload.name || userName,
          birthDate: ticket.payload.birthDate || profile.birthDate,
          birthTime: ticket.payload.birthTime || profile.birthTime,
          gender: ticket.payload.gender || profile.gender,
          mbti: normalizeMbtiInput(ticket.payload.mbti),
        };
        lastPayloadRef.current = ticket.payload;
        resultTrackedRef.current = false;
        setActiveMeta(meta);
        setSavedResult(null);
        setHasStarted(true);
        submit(ticket.payload);
        return;
      }

      // pending 주문이 유실되어 payload가 null로 복구된 경우: 현재 프로필로 재조립 또는 토큰 보관
      const fallbackSaju = profile.birthDate
        ? safeCalculateSaju(profile.birthDate, profile.birthTime, profile.gender)
        : null;
      if (profile.birthDate && fallbackSaju) {
        const rebuiltPayload = {
          type: 'saju_mate',
          name: userName,
          gender: profile.gender,
          mbti: normalizeMbtiInput(profile.mbti),
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
        };
        lastPayloadRef.current = rebuiltPayload;
        resultTrackedRef.current = false;
        setActiveMeta({
          name: userName,
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          gender: profile.gender,
          mbti: normalizeMbtiInput(profile.mbti),
        });
        setSavedResult(null);
        setHasStarted(true);
        submit(rebuiltPayload);
        return;
      }

      if (ticket.receiptToken) {
        setRecoveredReceiptToken(ticket.receiptToken);
      }
      return;
    }

    // 티켓이 없으면 직전 저장된 결과를 localStorage에서 복원
    try {
      const raw = localStorage.getItem(GUEST_SAJU_MATE_RESULT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.result) {
          setSavedResult(parsed.result);
          if (parsed.meta) setActiveMeta(parsed.meta);
          setHasStarted(true);
          return;
        }
      }
    } catch {
      // ignore storage errors
    }

    // 기존 저장 생년월일이 있으면 1클릭 마찰 없이 무료 만세력·티저 즉시 표시
    if (!autoPreviewAppliedRef.current && profile.birthDate && safeCalculateSaju(profile.birthDate, profile.birthTime, profile.gender)) {
      autoPreviewAppliedRef.current = true;
      setHasPreviewed(true);
    }
  }, [submit, profile.birthDate, profile.birthTime, profile.gender, profile.mbti, userName]);

  // 완성된 결과를 localStorage에 보존하여 새로고침 시 유지
  useEffect(() => {
    if (!isLoading && result && result.bestMatch && result.worstMatch && !genError) {
      const meta = lastPayloadRef.current
        ? {
            name: lastPayloadRef.current.name || userName,
            birthDate: lastPayloadRef.current.birthDate || profile.birthDate,
            birthTime: lastPayloadRef.current.birthTime || profile.birthTime,
            gender: lastPayloadRef.current.gender || profile.gender,
            mbti: normalizeMbtiInput(lastPayloadRef.current.mbti),
          }
        : {
            name: userName,
            birthDate: profile.birthDate,
            birthTime: profile.birthTime,
            gender: profile.gender,
            mbti: normalizeMbtiInput(profile.mbti),
          };
      setSavedResult(result);
      setActiveMeta(meta);
      if (!resultTrackedRef.current) {
        resultTrackedRef.current = true;
        const matched = meta.birthDate
          ? (() => {
              const s = safeCalculateSaju(meta.birthDate, meta.birthTime || '', meta.gender || 'female');
              return s
                ? calculateSajuMateMatch({
                    birthDate: meta.birthDate,
                    birthTime: meta.birthTime || '',
                    gender: meta.gender || 'female',
                    mbti: meta.mbti || '',
                    dayMasterKorean: s.dayMaster.korean,
                    elementRatio: s.elementRatio,
                  })
                : null;
            })()
          : null;
        track('saju_mate_result_view', {
          bestId: matched?.bestCharacter.id || result.bestCharacterId || '',
          worstId: matched?.worstCharacter.id || result.worstCharacterId || '',
          mirrorId: matched?.mirrorCharacter.id || result.mirrorCharacterId || '',
        });
      }
      try {
        localStorage.setItem(GUEST_SAJU_MATE_RESULT_KEY, JSON.stringify({ result, meta }));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [isLoading, result, genError, profile.birthDate, profile.birthTime, profile.gender, profile.mbti, userName]);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % MATE_LOADING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleOpenPreview = () => {
    if (!profile.birthDate || !calculatedSaju) {
      setError('유효한 생년월일(1900~2050년)을 먼저 입력해 주세요.');
      return;
    }
    setError(null);
    setHasPreviewed(true);
    track('saju_mate_free_preview_open');
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleStartPayment = async () => {
    if (!profile.birthDate || !calculatedSaju) {
      setError('유효한 생년월일을 입력해 주세요.');
      return;
    }
    setIsPaying(true);
    setError(null);
    setGenError(null);
    track('saju_mate_payment_click');

    try {
      const returnPath = isEmbedded ? '/myluck?type=mate' : '/mate';
      const res = await startServicePayment({
        serviceType: 'SAJU_MATE',
        serviceName: '말랑 사주 메이트 궁합',
        returnPath,
        payload: {
          type: 'saju_mate',
          name: userName,
          gender: profile.gender,
          mbti: normalizeMbtiInput(profile.mbti),
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
        },
        customerName: userName,
      });
      if (!res.success && res.error_msg) {
        setError(res.error_msg);
      }
    } catch (e: any) {
      setError(e?.message || '결제창을 여는 중 오류가 발생했습니다.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleStartRecoveredPaidAnalysis = () => {
    if (!recoveredReceiptToken) return;
    if (!profile.birthDate || !calculatedSaju) {
      setError('유효한 생년월일(1900~2050년)을 먼저 입력해 주세요.');
      return;
    }
    const rebuiltPayload = {
      type: 'saju_mate',
      name: userName,
      gender: profile.gender,
      mbti: normalizeMbtiInput(profile.mbti),
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
    };
    receiptTokenRef.current = recoveredReceiptToken;
    setRecoveredReceiptToken(null);
    lastPayloadRef.current = rebuiltPayload;
    setActiveMeta({
      name: userName,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      gender: profile.gender,
      mbti: normalizeMbtiInput(profile.mbti),
    });
    setSavedResult(null);
    setError(null);
    setGenError(null);
    setHasStarted(true);
    submit(rebuiltPayload);
  };

  const handleRetry = () => {
    if (!lastPayloadRef.current) return;
    setGenError(null);
    setError(null);
    submit(lastPayloadRef.current);
  };

  const displayResult = (result || savedResult) as any;
  const displayMeta = useMemo(
    () =>
      activeMeta || {
        name: userName,
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        gender: profile.gender,
        mbti: normalizeMbtiInput(profile.mbti),
      },
    [activeMeta, userName, profile.birthDate, profile.birthTime, profile.gender, profile.mbti]
  );
  const displayName = displayMeta.name || '이용자';
  const displaySaju = useMemo(() => {
    if (!displayMeta.birthDate) return calculatedSaju;
    return safeCalculateSaju(
      displayMeta.birthDate,
      displayMeta.birthTime || '',
      displayMeta.gender || 'female'
    );
  }, [displayMeta.birthDate, displayMeta.birthTime, displayMeta.gender, calculatedSaju]);

  const deterministicMatch = useMemo(() => {
    if (!displaySaju || !displayMeta.birthDate) return null;
    return calculateSajuMateMatch({
      birthDate: displayMeta.birthDate,
      birthTime: displayMeta.birthTime || '',
      gender: displayMeta.gender || 'female',
      mbti: displayMeta.mbti || '',
      dayMasterKorean: displaySaju.dayMaster.korean,
      elementRatio: displaySaju.elementRatio,
    });
  }, [displaySaju, displayMeta]);

  const handleDownloadStoryCard = async () => {
    if (!shareRef.current || !displayResult) return;
    setIsSharing(true);
    track('saju_mate_story_download');
    try {
      const done = await generateImage(shareRef.current, `MBTIJU_SajuMate_${Date.now()}`, 2, {
        title: '말랑 사주 메이트 궁합 | MBTIJU',
        text: `${displayName}님의 말랑 사주 메이트 궁합 결과입니다!`,
        backgroundColor: '#FFF7F5',
      });
      if (done) {
        alert('인스타그램 스토리용 궁합 카드가 준비되었습니다!');
      }
    } catch (err) {
      console.error(err);
      alert('이미지 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSharing(false);
    }
  };

  const bestChar = deterministicMatch?.bestCharacter || (displayResult?.bestCharacterId ? getSajuMateById(displayResult.bestCharacterId) : null);
  const worstChar = deterministicMatch?.worstCharacter || (displayResult?.worstCharacterId ? getSajuMateById(displayResult.worstCharacterId) : null);
  const mirrorChar = deterministicMatch?.mirrorCharacter || (displayResult?.mirrorCharacterId ? getSajuMateById(displayResult.mirrorCharacterId) : null);
  const resolvedBestScore = deterministicMatch?.bestScore || displayResult?.bestScore || 92;
  const resolvedWorstAlertScore = deterministicMatch?.worstAlertScore || displayResult?.worstAlertScore || 86;
  const resolvedDimensions = deterministicMatch?.dimensions || displayResult?.dimensions || [];
  const friendChemistry = useMemo(() => {
    if (!friendChar || !mirrorChar) return null;
    return calculateFriendMateChemistry(mirrorChar, friendChar);
  }, [friendChar, mirrorChar]);

  const handleShareLink = async () => {
    const shareMirrorId = mirrorChar?.id || bestChar?.id || 'mochi';
    const shareUrl = `${window.location.origin}/mate?fromName=${encodeURIComponent(displayName)}&mirror=${encodeURIComponent(shareMirrorId)}`;
    const shareText = `${displayName}님의 숨은 사주 메이트는 '${mirrorChar?.name || bestChar?.name || '모찌'}'! 나랑 케미는 몇 점일지 확인해 보세요.`;
    track('saju_mate_link_share');
    try {
      if (navigator.share) {
        await navigator.share({ title: '말랑 사주 메이트 궁합 | MBTIJU', text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopyDone(true);
        setTimeout(() => setCopyDone(false), 2500);
      }
    } catch {
      // user cancelled share
    }
  };

  const renderParagraphs = (
    text?: string,
    options?: { textClass?: string; dotClass?: string }
  ) => {
    if (!text) return null;
    const textClass = options?.textClass || 'text-slate-700';
    const dotClass = options?.dotClass || 'bg-violet-500';
    return stripMarkdown(text)
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((line, idx) => {
        if (/^[-•*]\s+/.test(line)) {
          return (
            <div key={idx} className={`flex items-start gap-2.5 text-[14px] sm:text-[15px] ${textClass} leading-[1.78] break-keep`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotClass} shrink-0 mt-2.5`} />
              <span>{line.replace(/^[-•*]\s+/, '').trim()}</span>
            </div>
          );
        }
        return (
          <p key={idx} className={`text-[14px] sm:text-[15px] ${textClass} leading-[1.82] break-keep`}>
            {line}
          </p>
        );
      });
  };

  const shareResultPayload = useMemo(() => {
    if (!displayResult) return null;
    return {
      ...displayResult,
      bestCharacterId: bestChar?.id || displayResult.bestCharacterId,
      worstCharacterId: worstChar?.id || displayResult.worstCharacterId,
      mirrorCharacterId: mirrorChar?.id || displayResult.mirrorCharacterId,
      bestScore: resolvedBestScore,
      worstAlertScore: resolvedWorstAlertScore,
    };
  }, [displayResult, bestChar?.id, worstChar?.id, mirrorChar?.id, resolvedBestScore, resolvedWorstAlertScore]);
  const elementKeys: FiveElementKey[] = ['wood', 'fire', 'earth', 'metal', 'water'];

  return (
    <div className={isEmbedded ? 'pb-12' : 'min-h-screen bg-gradient-to-b from-[#FFF8F6] via-[#FAF7FF] to-white pt-20 pb-28'}>
      <div className="max-w-3xl mx-auto px-4">
        {/* Top Back Navigation (standalone page only) */}
        {!isEmbedded && (
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              홈으로
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-rose-200 text-xs font-black text-rose-600 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              비회원 건당 {SERVICE_COSTS.SAJU_MATE.toLocaleString()}원
            </span>
          </div>
        )}

        {/* Friend Invite Comparison Banner */}
        {friendChar && (
          <div className="mb-5 rounded-2xl bg-gradient-to-r from-violet-50 via-white to-rose-50 border border-violet-200/90 p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-violet-200 p-1 shrink-0 shadow-xs">
              <img src={friendChar.imagePath} alt={friendChar.name} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 text-[10px] font-black text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full mb-1">
                <Users className="w-3 h-3" />
                친구 초대 케미 비교
              </div>
              <p className="text-xs sm:text-sm font-black text-slate-900 break-keep">
                {friendFromName}님의 숨은 본캐는 &lsquo;{friendChar.name}&rsquo;! 내 메이트를 찾고 {friendFromName}님과의 오행 케미를 확인해 보세요.
              </p>
            </div>
          </div>
        )}

        {/* Step 0: Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF1EE] via-[#FDF4FF] to-[#EFF6FF] border border-rose-200/70 p-6 sm:p-8 text-center shadow-sm mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/90 border border-rose-200 text-[11px] font-black text-rose-600 mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            신규 · 사주 원국 × MBTI 말랑 캐릭터 궁합
          </div>

          {/* Floating Character Avatars */}
          <div className="flex items-center justify-center -space-x-3 mb-5">
            {SAJU_MATE_CHARACTERS.slice(0, 4).map((char, idx) => (
              <div
                key={char.id}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-2 border-white shadow-md overflow-hidden p-1 transition-transform hover:-translate-y-1"
                style={{ zIndex: 10 - idx }}
              >
                <img src={char.imagePath} alt={char.name} className="w-full h-full object-contain" />
              </div>
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug break-keep">
            나의 <span className="text-violet-600">사주 본캐 유형</span>과{' '}
            <span className="text-emerald-600">찰떡</span> ·{' '}
            <span className="text-rose-500">상극 메이트</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2.5 leading-relaxed max-w-xl mx-auto break-keep">
            생년월일시(만세력 4주 8자)와 MBTI를 교차 분석해, 내가 9종 캐릭터 중 어떤 유형인지부터
            부족한 오행을 채워줄 찰떡 단짝과 기 빨리는 상극 캐릭터까지 한 번에 알려드려요.
          </p>

          {/* 9종 말랑 메이트 미리보기 스트립 */}
          <div className="mt-6 pt-5 border-t border-rose-200/50">
            <p className="text-[11px] font-extrabold text-slate-500 mb-3">
              9종의 오리지널 말랑 사주 메이트 중 내 운명의 단짝은?
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
              {SAJU_MATE_CHARACTERS.map((char) => (
                <div
                  key={char.id}
                  className="bg-white/90 rounded-2xl border border-white p-1.5 shadow-xs flex flex-col items-center"
                >
                  <img
                    src={char.imagePath}
                    alt={char.name}
                    loading="lazy"
                    className="w-11 h-11 sm:w-12 sm:h-12 object-contain"
                  />
                  <span className="text-[10px] font-black text-slate-700 mt-1">{char.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Step 1 & 2: Input + Free Preview (shown when not yet started analysis) */}
        {!hasStarted && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black text-violet-600 uppercase tracking-wider">1단계</span>
                  <h2 className="text-lg font-black text-slate-900">내 사주 · MBTI 정보 입력</h2>
                </div>
                <span className="text-[11px] font-bold text-slate-400">회원가입 없음</span>
              </div>

              <GuestProfileCard
                profile={profile}
                onChange={updateProfile}
                title="궁합을 볼 내 정보"
                showName
              />

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                  {error}
                </div>
              )}

              {recoveredReceiptToken ? (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                    결제가 정상 확인되었습니다! 생년월일을 확인한 뒤 아래 버튼을 눌러 분석을 시작해 주세요.
                  </div>
                  <button
                    type="button"
                    onClick={handleStartRecoveredPaidAnalysis}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>결제된 말랑 사주 메이트 분석 바로 시작하기</span>
                  </button>
                </div>
              ) : (
                (!hasPreviewed || !calculatedSaju) && (
                  <button
                    type="button"
                    onClick={handleOpenPreview}
                    className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-violet-700 text-white font-black text-sm sm:text-base shadow-lg shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>무료 만세력 &amp; 내 메이트 실루엣 티저 먼저 보기</span>
                  </button>
                )
              )}
            </div>

            {/* Step 2: Free Manseryeok + Silhouette Teaser */}
            {hasPreviewed && calculatedSaju && teaserInfo && (
              <div ref={previewRef} className="space-y-6 animate-fade-up">
                {/* 무료 만세력 4주 8자 원국표 */}
                <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5 sm:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mb-1.5">
                        2단계 · 무료 만세력 미리보기
                      </span>
                      <h3 className="text-lg font-black text-slate-900">
                        {userName}님의 4주 8자 원국 ({calculatedSaju.ganZhi.day}일주 · {calculatedSaju.dayMaster.korean})
                      </h3>
                    </div>
                    {profile.mbti && (
                      <span className="px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs font-black text-violet-700">
                        {profile.mbti.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="[&>div]:!mb-0">
                    <SajuGrid saju={calculatedSaju} />
                  </div>

                  {/* 오행 밸런스 요약 */}
                  <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-black text-slate-800">내 사주 오행 밸런스</span>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full border font-bold ${ELEMENT_LABELS[teaserInfo.dominantElement].pillClass}`}>
                          강한 기운: {ELEMENT_LABELS[teaserInfo.dominantElement].ko}({ELEMENT_LABELS[teaserInfo.dominantElement].hanja})
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full border bg-white text-slate-600 border-slate-200 font-bold">
                          부족한 기운: {ELEMENT_LABELS[teaserInfo.lackingElement].ko}({ELEMENT_LABELS[teaserInfo.lackingElement].hanja})
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {elementKeys.map((key) => {
                        const meta = ELEMENT_LABELS[key];
                        const pct = calculatedSaju.elementRatio[key] || 0;
                        return (
                          <div key={key} className="bg-white rounded-xl p-2 text-center border border-stone-200/70">
                            <div className="text-[11px] font-bold text-slate-800">
                              {meta.ko}({meta.hanja})
                            </div>
                            <div className="text-[10px] font-semibold text-slate-400">{pct}%</div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                              <div className={`${meta.barColor} h-full rounded-full`} style={{ width: `${Math.max(pct, 8)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 잠금 실루엣 티저 카드 2장 + 990원 결제 CTA */}
                <div className="bg-white rounded-3xl border-2 border-rose-200/90 shadow-lg shadow-rose-100/50 p-5 sm:p-7 space-y-6">
                  <div className="text-center space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-black">
                      <Lock className="w-3.5 h-3.5" />
                      사주 · MBTI 교차 매칭 완료! 정체 확인 대기 중
                    </span>
                    <h3 className="text-xl font-black text-slate-900 break-keep">
                      {userName}님의 본캐 유형 &amp; 찰떡 · 상극 메이트가 포착되었어요
                    </h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Best Teaser */}
                    <div className="relative rounded-2xl bg-gradient-to-b from-emerald-50/90 to-white border border-emerald-200 p-5 text-center space-y-3 overflow-hidden">
                      <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                        최고의 찰떡 메이트 감지
                      </span>
                      <div className="py-2 relative">
                        <div className="blur-[2px] opacity-90">
                          <MysterySilhouetteSvg variant="best" element={teaserInfo.lackingElement} />
                        </div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/95 border border-emerald-200 text-xs font-black text-emerald-700 shadow-xs mt-1">
                          궁합 점수 {teaserInfo.bestScore}점
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed text-left bg-white/90 rounded-xl p-3 border border-emerald-100 relative">
                        <p className="font-bold text-slate-800 mb-1 break-keep">
                          {userName}님의 {calculatedSaju.ganZhi.day}일주({calculatedSaju.dayMaster.korean}) 기준, 부족한 {ELEMENT_LABELS[teaserInfo.lackingElement].ko}({ELEMENT_LABELS[teaserInfo.lackingElement].hanja}) 기운을 채워줄 단짝은...
                        </p>
                        <p className="blur-[4px] select-none text-slate-400">
                          당신이 혼자 끙끙 앓을 때 말없이 곁에서 에너지를 회복시켜 주며, 현실 케미가 폭발하는 운명의 말랑 메이트입니다.
                        </p>
                      </div>
                    </div>

                    {/* Worst Teaser */}
                    <div className="relative rounded-2xl bg-gradient-to-b from-rose-50/90 to-white border border-rose-200 p-5 text-center space-y-3 overflow-hidden">
                      <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-black">
                        피해야 할 상극 메이트 감지
                      </span>
                      <div className="py-2 relative">
                        <div className="blur-[2px] opacity-90">
                          <MysterySilhouetteSvg variant="worst" element={teaserInfo.dominantElement} />
                        </div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/95 border border-rose-200 text-xs font-black text-rose-600 shadow-xs mt-1">
                          상극 경보 {teaserInfo.worstAlertScore}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed text-left bg-white/90 rounded-xl p-3 border border-rose-100 relative">
                        <p className="font-bold text-slate-800 mb-1 break-keep">
                          {userName}님의 {calculatedSaju.ganZhi.day}일주 기준, 강한 {ELEMENT_LABELS[teaserInfo.dominantElement].ko}({ELEMENT_LABELS[teaserInfo.dominantElement].hanja}) 기운과 부딪혀 감정 배터리를 깎는 상극은...
                        </p>
                        <p className="blur-[4px] select-none text-slate-400">
                          처음에는 매력적으로 다가오지만 결국 감정 배터리를 바닥내며 대환장 갈등을 만드는 상극 메이트와 현실 대처법이 담겨 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* What's Included List */}
                  <div className="bg-slate-50 rounded-2xl p-4 grid sm:grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>찰떡 · 상극 · 숨은 본캐 메이트 일러스트 공개</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>5대 케미 스탯 &amp; 현실 판별 신호 3가지</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>현실 연애·직장·친구 처방 &amp; 5분 개운 루틴</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>인스타 스토리 9:16 고화질 결과 카드 무료 저장</span>
                    </div>
                  </div>

                  {/* Step 3: 990원 단건 결제 CTA */}
                  <button
                    type="button"
                    disabled={isPaying}
                    onClick={handleStartPayment}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-600 hover:from-rose-600 hover:to-violet-700 text-white font-black text-base shadow-xl shadow-rose-200/70 flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-60"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>결제창으로 이동 중...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        <span>찰떡 · 상극 메이트 정체 전체 보기</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-slate-400 font-medium">
                    회원가입 · 정기구독 없이 단 1회 {SERVICE_COSTS.SAJU_MATE.toLocaleString()}원 결제 후 즉시 결과가 생성됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Streaming & Full Result Report */}
        {hasStarted && (
          <ReportErrorBoundary onRetry={handleRetry}>
            <div className="space-y-6 animate-fade-in">
              <StreamingStatusBanner
                isStreaming={isLoading}
                hasData={Boolean(displayResult)}
                error={genError}
                onRetry={handleRetry}
                streamingTitle={MATE_LOADING_MESSAGES[loadingMsgIdx] ?? MATE_LOADING_MESSAGES[0]!}
                streamingSubtitle="만세력 오행과 MBTI 기질을 정밀 교차 분석 중입니다. 완성된 섹션부터 바로 표시됩니다."
                completedText="말랑 사주 메이트 궁합 분석이 완료되었습니다."
              />

              {/* Result Body */}
              {displayResult && (
                <div className="space-y-6">
                  {/* Headline Card */}
                  <div className="bg-white rounded-3xl border border-violet-200/80 p-6 sm:p-7 text-center shadow-sm space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-black">
                      <span>{displayName}님의 분석 완료</span>
                      {displaySaju && <span>· {displaySaju.ganZhi.day}일주</span>}
                      {displayMeta.mbti && <span>· {displayMeta.mbti.toUpperCase()}</span>}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug break-keep">
                      {stripMarkdown(displayResult.headline || '내 사주 본캐 유형과 찰떡 · 상극 메이트 리포트')}
                    </h2>
                  </div>

                  {/* Hero Card 1: My Character Type (내가 어떤 유형인지 최상단 공개) */}
                  {mirrorChar && (
                    <div className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/60 rounded-3xl border-2 border-violet-200 shadow-md overflow-hidden">
                      <div className="bg-violet-100/70 px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-violet-200/70">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-violet-800">
                          <Sparkles className="w-4 h-4 text-violet-600" />
                          {displayName}님의 사주 × MBTI 본캐 유형
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white text-violet-700 border border-violet-200 text-[11px] font-black">
                          {mirrorChar.elementBadge}
                        </span>
                      </div>

                      <div className="p-6 sm:p-7 space-y-5">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                          <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-3xl bg-white border-2 border-violet-100 p-2.5 shrink-0 shadow-sm">
                            <img
                              src={mirrorChar.imagePath}
                              alt={mirrorChar.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-violet-600 text-white text-[11px] font-black">
                                내 본캐 유형
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 text-[11px] font-bold">
                                {mirrorChar.sajuTrait}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                                {mirrorChar.name}
                              </h3>
                              <p className="text-xs sm:text-sm font-bold text-violet-700 mt-0.5 break-keep">
                                {mirrorChar.subtitle}
                              </p>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed break-keep">
                              “{mirrorChar.tagline}”
                            </p>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 pt-0.5">
                              {mirrorChar.keywords.map((kw) => (
                                <span
                                  key={kw}
                                  className="px-2.5 py-0.5 rounded-full bg-white text-violet-700 border border-violet-200/80 text-[11px] font-bold"
                                >
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {displayResult.mirrorSummary && (
                          <div className="bg-white/90 rounded-2xl border border-violet-100 p-4 sm:p-5 space-y-2.5">
                            <h4 className="text-xs sm:text-sm font-black text-violet-900">
                              왜 {displayName}님의 유형이 &lsquo;{mirrorChar.name}&rsquo;일까?
                            </h4>
                            <div className="space-y-2.5">
                              {renderParagraphs(displayResult.mirrorSummary, {
                                dotClass: 'bg-violet-500',
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Best vs Worst Match Visual Comparison */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    {/* Best Match Card */}
                    {bestChar && (
                      <div className="bg-white rounded-3xl border-2 border-emerald-200 shadow-md overflow-hidden flex flex-col">
                        <div className="bg-emerald-50/90 px-5 py-3 flex items-center justify-between border-b border-emerald-100">
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800">
                            <Heart className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                            최고의 찰떡 메이트
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-black">
                            {resolvedBestScore}점
                          </span>
                        </div>
                        <div className="p-6 text-center flex-1 flex flex-col items-center">
                          <div className="w-44 h-44 rounded-3xl bg-white border border-emerald-100 p-2 mb-4 shadow-xs">
                            <img
                              src={bestChar.imagePath}
                              alt={bestChar.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <h3 className="text-2xl font-black text-slate-900">{bestChar.name}</h3>
                          <p className="text-xs font-bold text-slate-500 mt-0.5">{bestChar.subtitle}</p>
                          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                              {bestChar.elementBadge}
                            </span>
                            {bestChar.keywords.slice(0, 2).map((kw) => (
                              <span key={kw} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                                #{kw}
                              </span>
                            ))}
                          </div>
                          {displayResult.bestMatch?.chemistryTitle && (
                            <p className="mt-4 w-full px-3.5 py-2.5 rounded-xl bg-emerald-50/70 text-emerald-900 text-xs font-extrabold leading-relaxed break-keep">
                              “{stripMarkdown(displayResult.bestMatch.chemistryTitle)}”
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Worst Match Card */}
                    {worstChar && (
                      <div className="bg-white rounded-3xl border-2 border-rose-200 shadow-md overflow-hidden flex flex-col">
                        <div className="bg-rose-50/90 px-5 py-3 flex items-center justify-between border-b border-rose-100">
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-700">
                            <ShieldAlert className="w-4 h-4 text-rose-500" />
                            피해야 할 상극 메이트
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black">
                            경보 {resolvedWorstAlertScore}%
                          </span>
                        </div>
                        <div className="p-6 text-center flex-1 flex flex-col items-center">
                          <div className="w-44 h-44 rounded-3xl bg-white border border-rose-100 p-2 mb-4 shadow-xs">
                            <img
                              src={worstChar.imagePath}
                              alt={worstChar.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <h3 className="text-2xl font-black text-slate-900">{worstChar.name}</h3>
                          <p className="text-xs font-bold text-slate-500 mt-0.5">{worstChar.subtitle}</p>
                          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                              {worstChar.elementBadge}
                            </span>
                            {worstChar.keywords.slice(0, 2).map((kw) => (
                              <span key={kw} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                                #{kw}
                              </span>
                            ))}
                          </div>
                          {displayResult.worstMatch?.warningTitle && (
                            <p className="mt-4 w-full px-3.5 py-2.5 rounded-xl bg-rose-50/70 text-rose-900 text-xs font-extrabold leading-relaxed break-keep">
                              “{stripMarkdown(displayResult.worstMatch.warningTitle)}”
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Saju Balance Summary + 5D Chemistry Radar Chart */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    {displaySaju && deterministicMatch && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between space-y-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[11px] font-black">
                            내 사주 원국 · 오행 기운 지도
                          </span>
                          <h4 className="text-base font-black text-slate-900">
                            {displaySaju.ganZhi.day}일주 ({displaySaju.dayMaster.korean})
                            {displayMeta.mbti ? ` × ${displayMeta.mbti.toUpperCase()}` : ''}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium break-keep">
                            강한 기운{' '}
                            <strong className="text-slate-800">
                              {ELEMENT_LABELS[deterministicMatch.dominantElement].ko}({ELEMENT_LABELS[deterministicMatch.dominantElement].hanja})
                            </strong>
                            {' · '}부족한 기운{' '}
                            <strong className="text-emerald-700">
                              {ELEMENT_LABELS[deterministicMatch.lackingElement].ko}({ELEMENT_LABELS[deterministicMatch.lackingElement].hanja})
                            </strong>
                          </p>
                        </div>
                        <div className="space-y-2.5">
                          {elementKeys.map((key) => {
                            const meta = ELEMENT_LABELS[key];
                            const pct = displaySaju.elementRatio[key] || 0;
                            return (
                              <div key={key} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="text-slate-700">
                                    {meta.ko}({meta.hanja})
                                  </span>
                                  <span className="text-slate-500">{pct}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`${meta.barColor} h-full rounded-full`}
                                    style={{ width: `${Math.max(pct, 6)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {Array.isArray(resolvedDimensions) && resolvedDimensions.length >= 3 && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col items-center justify-center">
                        <h4 className="text-sm font-black text-slate-900 mb-1">
                          {bestChar?.name || '찰떡 메이트'}와의 5대 케미 스탯
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium mb-2">
                          사주 오행 조화 · MBTI 공명 지수
                        </p>
                        <MateRadarChart data={resolvedDimensions} />
                      </div>
                    )}
                  </div>

                  {/* Bonus: Friend Invite Chemistry Comparison Card */}
                  {friendChar && friendChemistry && mirrorChar && (
                    <div className="rounded-3xl bg-gradient-to-r from-violet-50 via-white to-rose-50 border-2 border-violet-200 p-5 sm:p-6 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600 text-white text-[11px] font-black">
                          <Users className="w-3.5 h-3.5" />
                          친구와의 오행 케미 비교
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${friendChemistry.badgeClass}`}>
                          {friendChemistry.relationLabel} · {friendChemistry.score}점
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-4 sm:gap-6 py-2">
                        <div className="text-center">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-violet-200 p-1.5 mx-auto shadow-xs">
                            <img src={mirrorChar.imagePath} alt={mirrorChar.name} className="w-full h-full object-contain" />
                          </div>
                          <p className="text-xs font-black text-slate-900 mt-1.5">{displayName}</p>
                          <p className="text-[11px] font-bold text-violet-700">{mirrorChar.name}</p>
                        </div>

                        <div className="flex flex-col items-center">
                          <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                          <span className="text-sm font-black text-slate-900 mt-1">{friendChemistry.score}점</span>
                        </div>

                        <div className="text-center">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-rose-200 p-1.5 mx-auto shadow-xs">
                            <img src={friendChar.imagePath} alt={friendChar.name} className="w-full h-full object-contain" />
                          </div>
                          <p className="text-xs font-black text-slate-900 mt-1.5">{friendFromName}</p>
                          <p className="text-[11px] font-bold text-rose-600">{friendChar.name}</p>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-white/90 rounded-2xl p-4 border border-violet-100 break-keep">
                        {friendChemistry.summary}
                      </p>
                    </div>
                  )}

                  {/* Deep Analysis 1: Best Match */}
                  {bestChar && displayResult.bestMatch && (
                    <div className="bg-white rounded-3xl border border-emerald-200/80 p-6 sm:p-7 space-y-5 shadow-xs">
                      <div className="flex items-center gap-3 pb-4 border-b border-emerald-100">
                        <img
                          src={bestChar.imagePath}
                          alt={bestChar.name}
                          className="w-12 h-12 rounded-2xl border border-emerald-100 p-1 bg-emerald-50/40 object-contain"
                        />
                        <div>
                          <span className="text-[11px] font-black text-emerald-600">찰떡 궁합 분석</span>
                          <h3 className="text-lg font-black text-slate-900">
                            왜 {bestChar.name}가 {displayName}님의 찰떡 메이트일까?
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-black text-emerald-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" /> 사주 · MBTI 명리 궁합 이유
                        </h4>
                        <div className="space-y-3">{renderParagraphs(displayResult.bestMatch.sajuReason)}</div>
                      </div>

                      <div className="bg-emerald-50/50 rounded-2xl p-4 sm:p-5 border border-emerald-100 space-y-2.5">
                        <h4 className="text-sm font-black text-emerald-900">둘이 만나면 벌어지는 힐링 케미 장면</h4>
                        <div className="space-y-2.5">{renderParagraphs(displayResult.bestMatch.scenario)}</div>
                      </div>

                      {displayResult.bestMatch.luckySynergyTip && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                          <Wand2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="space-y-2 flex-1">
                            <p className="text-xs font-black text-slate-900">찰떡 인연 시너지 극대화 팁</p>
                            <div className="space-y-2">
                              {renderParagraphs(displayResult.bestMatch.luckySynergyTip, {
                                textClass: 'text-slate-600',
                                dotClass: 'bg-emerald-500',
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {displayResult.bestMatch.realPersonSignals && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/35 border border-emerald-200/70 space-y-2.5">
                          <h4 className="text-xs sm:text-sm font-black text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>현실에서 {bestChar.name} 유형을 단번에 알아보는 3가지 신호</span>
                          </h4>
                          <div className="space-y-2">
                            {renderParagraphs(displayResult.bestMatch.realPersonSignals, {
                              textClass: 'text-slate-700',
                              dotClass: 'bg-emerald-500',
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Deep Analysis 2: Worst Match */}
                  {worstChar && displayResult.worstMatch && (
                    <div className="bg-white rounded-3xl border border-rose-200/80 p-6 sm:p-7 space-y-5 shadow-xs">
                      <div className="flex items-center gap-3 pb-4 border-b border-rose-100">
                        <img
                          src={worstChar.imagePath}
                          alt={worstChar.name}
                          className="w-12 h-12 rounded-2xl border border-rose-100 p-1 bg-rose-50/40 object-contain"
                        />
                        <div>
                          <span className="text-[11px] font-black text-rose-600">상극 주의 분석</span>
                          <h3 className="text-lg font-black text-slate-900">
                            왜 {worstChar.name} 유형은 조심해야 할까?
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-black text-rose-700 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" /> 오행 충돌 &amp; 감정 소모 원인 분석
                        </h4>
                        <div className="space-y-3">{renderParagraphs(displayResult.worstMatch.conflictReason)}</div>
                      </div>

                      <div className="bg-rose-50/50 rounded-2xl p-4 sm:p-5 border border-rose-100 space-y-2.5">
                        <h4 className="text-sm font-black text-rose-900">함께 있으면 터지는 대환장 주의 시나리오</h4>
                        <div className="space-y-2.5">{renderParagraphs(displayResult.worstMatch.clashScenario)}</div>
                      </div>

                      {displayResult.worstMatch.redFlagSignals && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/35 border border-rose-200/70 space-y-2.5">
                          <h4 className="text-xs sm:text-sm font-black text-rose-800 flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>깊어지기 전 미리 알아채는 {worstChar.name} 유형 경보 신호</span>
                          </h4>
                          <div className="space-y-2">
                            {renderParagraphs(displayResult.worstMatch.redFlagSignals, {
                              textClass: 'text-slate-700',
                              dotClass: 'bg-rose-500',
                            })}
                          </div>
                        </div>
                      )}

                      {displayResult.worstMatch.survivalGuide && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white space-y-2">
                          <p className="text-xs font-black text-amber-300">현실 멘탈 방어 · 거리두기 처방전</p>
                          <div className="space-y-2">
                            {renderParagraphs(displayResult.worstMatch.survivalGuide, {
                              textClass: 'text-slate-200',
                              dotClass: 'bg-amber-300',
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Real Life Advice + Lucky Item */}
                  {(displayResult.realLifeAdvice || displayResult.luckyItem) && (
                    <div className="bg-[#FAF7F0] rounded-3xl border border-[#E6DFD1] p-6 sm:p-7 space-y-5">
                      <div className="space-y-2.5">
                        <span className="text-xs font-black text-amber-700">현실 인간관계 조언</span>
                        <h3 className="text-lg font-black text-slate-900">
                          현실 연애 · 친구 · 직장 관계에 적용하는 사주 처방
                        </h3>
                        <div className="space-y-3">{renderParagraphs(displayResult.realLifeAdvice)}</div>
                      </div>

                      {displayResult.luckyItem && (
                        <div className="space-y-3 pt-2">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="bg-white rounded-2xl border border-[#E6DFD1] p-4 flex items-start gap-3">
                              <Gift className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-black text-slate-900 mb-1">부족 오행 보완 아이템</p>
                                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed break-keep">
                                  {stripMarkdown(displayResult.luckyItem.item || '')}
                                </p>
                              </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-[#E6DFD1] p-4 flex items-start gap-3">
                              <Palette className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-black text-slate-900 mb-1">행운 밸런스 컬러</p>
                                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed break-keep">
                                  {stripMarkdown(displayResult.luckyItem.color || '')}
                                </p>
                              </div>
                            </div>
                          </div>
                          {displayResult.luckyItem.ritual && (
                            <div className="bg-white rounded-2xl border border-[#E6DFD1] p-4 flex items-start gap-3">
                              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-black text-slate-900 mb-1">오늘 바로 실천하는 5분 개운 루틴</p>
                                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed break-keep">
                                  {stripMarkdown(displayResult.luckyItem.ritual)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Viral Share Buttons */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3 shadow-xs">
                    <p className="text-center text-xs font-black text-slate-500">
                      결과를 인스타 스토리에 올리고 친구·연인과 비교해 보세요!
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={isSharing || isLoading}
                        onClick={handleDownloadStoryCard}
                        className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 hover:opacity-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                      >
                        {isSharing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Instagram className="w-4 h-4" />
                        )}
                        <span>인스타 스토리 카드 저장 (9:16)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareLink}
                        className="w-full py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>{copyDone ? '링크가 복사되었습니다!' : '친구에게 테스트 링크 공유'}</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.removeItem(GUEST_SAJU_MATE_RESULT_KEY);
                        } catch {
                          // ignore
                        }
                        receiptTokenRef.current = null;
                        lastPayloadRef.current = null;
                        setSavedResult(null);
                        setActiveMeta(null);
                        setGenError(null);
                        setError(null);
                        setHasStarted(false);
                        setHasPreviewed(false);
                      }}
                      className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>다른 생년월일 · MBTI로 새로 분석하기</span>
                    </button>
                  </div>

                  {/* Step 5: Bottom Upsell CTA */}
                  <FunnelBottomCta
                    from="saju_mate_result"
                    title="귀여운 캐릭터 궁합을 넘어, 실제 내 인연과 향후 3년 운의 흐름이 궁금하다면?"
                    subtitle="방금 확인한 내 사주 원국을 바탕으로 전문가 수기 검수 3년 심층 리포트와 1:1 카카오톡 맞춤 상담을 이어서 받아보세요."
                  />

                  {/* Hidden Off-screen 9:16 Instagram Story Share Card for html-to-image */}
                  {shareResultPayload && (
                    <div className="fixed left-[-9999px] top-0 pointer-events-none" aria-hidden="true">
                      <SajuMateShareCard
                        ref={shareRef}
                        userName={displayName}
                        dayPillarText={displaySaju ? `${displaySaju.ganZhi.day}일주` : undefined}
                        mbti={displayMeta.mbti}
                        result={shareResultPayload}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </ReportErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default SajuMatePage;
