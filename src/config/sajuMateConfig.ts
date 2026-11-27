// 말랑 사주 메이트 (오리지널 감성 캐릭터 9종) 단일 설정 및 결정론적 사주×MBTI 매칭 엔진
// 추후 IP 라이선스/리브랜딩 교체 시 본 설정 파일과 public/images/saju-mates/ 에셋만 교체하면 전체 서비스에 반영됩니다.

export type FiveElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export type SajuMateId =
  | 'mochi'
  | 'bory'
  | 'ttokki'
  | 'yuzu'
  | 'dori'
  | 'horang'
  | 'sori'
  | 'maru'
  | 'poni';

export interface SajuMateCharacter {
  id: SajuMateId;
  name: string;
  subtitle: string;
  archetype: string;
  tagline: string;
  imagePath: string;
  primaryElement: FiveElementKey;
  secondaryElement: FiveElementKey;
  elementBadge: string;
  sajuTrait: string;
  affinityStems: string[]; // 천간 한글 (갑, 을, 병, 정, 무, 기, 경, 신, 임, 계)
  affinityMbti: string[];
  clashMbti: string[];
  accentColor: string;
  softBgClass: string;
  borderClass: string;
  badgeClass: string;
  keywords: string[];
}

export const ELEMENT_LABELS: Record<FiveElementKey, { ko: string; hanja: string; barColor: string; pillClass: string }> = {
  wood: { ko: '목', hanja: '木', barColor: 'bg-emerald-500', pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  fire: { ko: '화', hanja: '火', barColor: 'bg-rose-500', pillClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  earth: { ko: '토', hanja: '土', barColor: 'bg-amber-500', pillClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  metal: { ko: '금', hanja: '金', barColor: 'bg-slate-600', pillClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  water: { ko: '수', hanja: '水', barColor: 'bg-sky-500', pillClass: 'bg-sky-50 text-sky-700 border-sky-200' },
};

export const SAJU_MATE_CHARACTERS: SajuMateCharacter[] = [
  {
    id: 'mochi',
    name: '모찌',
    subtitle: '작고 용감한 네잎클로버 햄곰',
    archetype: '순수 · 소심하지만 결정적 순간 용기 내는 성장형',
    tagline: '눈물은 좀 많지만 소중한 사람을 위해선 끝까지 버티는 순수 단짝',
    imagePath: '/images/saju-mates/mochi.jpg',
    primaryElement: 'wood',
    secondaryElement: 'water',
    elementBadge: '음목(乙木) · 식신 기운',
    sajuTrait: '정인 · 식신 기질',
    affinityStems: ['을', '계', '임', '기'],
    affinityMbti: ['ISFJ', 'INFP', 'INFJ', 'ISFP'],
    clashMbti: ['ESTJ', 'ENTJ', 'ESTP'],
    accentColor: '#10B981',
    softBgClass: 'bg-emerald-50/80',
    borderClass: 'border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    keywords: ['순수 힐링', '외유내강', '조용한 의리'],
  },
  {
    id: 'bory',
    name: '보리',
    subtitle: '하늘빛 귀 다정 수다쟁이 아기 고양이',
    archetype: '낙천 · 배려 · 생활력 만렙 분위기 메이커',
    tagline: '어색한 공기도 따뜻한 말 한마디로 녹여주는 타고난 소통왕',
    imagePath: '/images/saju-mates/bory.jpg',
    primaryElement: 'wood',
    secondaryElement: 'fire',
    elementBadge: '양목(甲木) · 음화(丁火)',
    sajuTrait: '정재 · 비견 기질',
    affinityStems: ['갑', '정', '병', '을'],
    affinityMbti: ['ENFJ', 'ESFJ', 'ENFP', 'ISFJ'],
    clashMbti: ['ISTP', 'INTP', 'INTJ'],
    accentColor: '#0EA5E9',
    softBgClass: 'bg-sky-50/80',
    borderClass: 'border-sky-200',
    badgeClass: 'bg-sky-100 text-sky-800',
    keywords: ['다정 소통왕', '긍정 에너지', '현실 센스'],
  },
  {
    id: 'ttokki',
    name: '토끼링',
    subtitle: '텐션 폭발 자유영혼 크림 토끼',
    archetype: '자유영혼 · 괴짜 천재 · 직관 행동파',
    tagline: '예측 불가한 돌발 매력으로 답답한 판을 단번에 뒤집는 천재 행동파',
    imagePath: '/images/saju-mates/ttokki.jpg',
    primaryElement: 'fire',
    secondaryElement: 'wood',
    elementBadge: '양화(丙火) · 역마 기운',
    sajuTrait: '상관 · 역마살 기질',
    affinityStems: ['병', '갑', '무', '임'],
    affinityMbti: ['ENTP', 'ESTP', 'ENFP', 'INTP'],
    clashMbti: ['ISTJ', 'ISFJ', 'ESTJ'],
    accentColor: '#F59E0B',
    softBgClass: 'bg-amber-50/80',
    borderClass: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800',
    keywords: ['텐션 폭주', '자유 영혼', '돌파 천재'],
  },
  {
    id: 'yuzu',
    name: '유자',
    subtitle: '별거울을 품은 도화빛 아기 여우',
    archetype: '자기애 만렙 · 뻔뻔한 애교 매력쟁이 · 감정 솔직형',
    tagline: '반짝이는 매력으로 시선을 사로잡지만 방심하면 감정 배터리를 쏙 빼가는 도화 요정',
    imagePath: '/images/saju-mates/yuzu.jpg',
    primaryElement: 'fire',
    secondaryElement: 'metal',
    elementBadge: '음화(丁火) · 도화 기운',
    sajuTrait: '도화살 · 상관 기질',
    affinityStems: ['정', '병', '신', '갑'],
    affinityMbti: ['ESFP', 'ENFP', 'ESTP', 'ENTP'],
    clashMbti: ['ISTJ', 'ISFJ', 'INTJ'],
    accentColor: '#FB7185',
    softBgClass: 'bg-rose-50/80',
    borderClass: 'border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-800',
    keywords: ['도화 매력', '솔직 애교', '에너지 뱀파이어'],
  },
  {
    id: 'dori',
    name: '도리',
    subtitle: '따뜻한 찻잔을 건네는 츤데레 레서판다',
    archetype: '과묵 · 미식 애호가 · 든든한 어른미 츤데레',
    tagline: '말수는 적어도 힘들 때 조용히 따뜻한 차와 빵을 내밀어 주는 묵직한 버팀목',
    imagePath: '/images/saju-mates/dori.jpg',
    primaryElement: 'earth',
    secondaryElement: 'metal',
    elementBadge: '양토(戊土) · 식신 기운',
    sajuTrait: '식신 · 정재 기질',
    affinityStems: ['무', '기', '경', '계'],
    affinityMbti: ['ISTP', 'ISTJ', 'INTJ', 'ISFP'],
    clashMbti: ['ENFP', 'ESFP', 'ENFJ'],
    accentColor: '#B45309',
    softBgClass: 'bg-orange-50/80',
    borderClass: 'border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-800',
    keywords: ['어른미 츤데레', '디저트 힐러', '묵직한 안정'],
  },
  {
    id: 'horang',
    name: '호랑',
    subtitle: '황금 나침반을 든 꼬마 백호 수호자',
    archetype: '카리스마 리더 · 정의감 · 추진력 폭발 해결사',
    tagline: '위기 앞에서는 누구보다 든든하게 앞장서서 길을 열어주는 수호자형 책임 리더',
    imagePath: '/images/saju-mates/horang.jpg',
    primaryElement: 'metal',
    secondaryElement: 'earth',
    elementBadge: '양금(庚金) · 편관 기운',
    sajuTrait: '편관 · 정관 기질',
    affinityStems: ['경', '신', '무', '병'],
    affinityMbti: ['ENTJ', 'ESTJ', 'ENFJ', 'INTJ'],
    clashMbti: ['INFP', 'ISFP', 'INTP'],
    accentColor: '#475569',
    softBgClass: 'bg-slate-50/90',
    borderClass: 'border-slate-300',
    badgeClass: 'bg-slate-200 text-slate-800',
    keywords: ['카리스마 리더', '결단력 갑', '든든한 수호자'],
  },
  {
    id: 'sori',
    name: '소리',
    subtitle: '은빛 별방울을 품은 도도한 아기 뱁새',
    archetype: '섬세한 미학가 · 도도 츤데레 · 예리한 직관력',
    tagline: '겉으론 차분하고 도도해 보여도 내 사람에게는 디테일하게 마음을 쓰는 반전 매력',
    imagePath: '/images/saju-mates/sori.jpg',
    primaryElement: 'metal',
    secondaryElement: 'water',
    elementBadge: '음금(辛金) · 편인 기운',
    sajuTrait: '편인 · 상관 기질',
    affinityStems: ['신', '계', '경', '임'],
    affinityMbti: ['INTJ', 'INFJ', 'INTP', 'ISTP'],
    clashMbti: ['ESFP', 'ENFP', 'ESFJ'],
    accentColor: '#6366F1',
    softBgClass: 'bg-indigo-50/80',
    borderClass: 'border-indigo-200',
    badgeClass: 'bg-indigo-100 text-indigo-800',
    keywords: ['섬세 미학가', '도도 츤데레', '직관 천재'],
  },
  {
    id: 'maru',
    name: '마루',
    subtitle: '별빛 랜턴을 품은 성실 만렙 아기 물범',
    archetype: '성실 끝판왕 · 꾸준한 노력 · 따뜻한 성장 파트너',
    tagline: '작은 약속도 허투루 넘기지 않고 함께 성장의 기운을 끌어올리는 다정한 치어리더',
    imagePath: '/images/saju-mates/maru.jpg',
    primaryElement: 'water',
    secondaryElement: 'wood',
    elementBadge: '양수(壬水) · 정인 기운',
    sajuTrait: '정인 · 정재 기질',
    affinityStems: ['임', '계', '을', '기'],
    affinityMbti: ['ESFJ', 'ISFJ', 'ESTJ', 'ISTJ'],
    clashMbti: ['ENTP', 'INTP', 'ESTP'],
    accentColor: '#0284C7',
    softBgClass: 'bg-sky-50/70',
    borderClass: 'border-sky-200',
    badgeClass: 'bg-sky-100 text-sky-800',
    keywords: ['성실 끝판왕', '별빛 힐러', '성장 파트너'],
  },
  {
    id: 'poni',
    name: '포니',
    subtitle: '동화책을 품은 보살 멘탈 핑크 다람쥐',
    archetype: '조용한 다정함 · 수집가 · 어떤 모난 성격도 품는 힐러',
    tagline: '지친 마음을 말없이 어루만져 주고 내 속도를 존중해 주는 온화한 안식처',
    imagePath: '/images/saju-mates/poni.jpg',
    primaryElement: 'water',
    secondaryElement: 'earth',
    elementBadge: '음수(癸水) · 화개 기운',
    sajuTrait: '정인 · 화개살 기질',
    affinityStems: ['임', '계', '기', '을'],
    affinityMbti: ['INFJ', 'ISFP', 'INFP', 'INTP'],
    clashMbti: ['ESTP', 'ESTJ', 'ENTJ'],
    accentColor: '#EC4899',
    softBgClass: 'bg-pink-50/80',
    borderClass: 'border-pink-200',
    badgeClass: 'bg-pink-100 text-pink-800',
    keywords: ['보살 포용력', '섬세한 다정', '고요한 쉼터'],
  },
];

export const SAJU_MATE_MAP: Record<SajuMateId, SajuMateCharacter> = SAJU_MATE_CHARACTERS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<SajuMateId, SajuMateCharacter>
);

export function isValidSajuMateId(id?: string | null): id is SajuMateId {
  return Boolean(id && id in SAJU_MATE_MAP);
}

export function getSajuMateById(id?: string | null): SajuMateCharacter {
  if (id && id in SAJU_MATE_MAP) {
    return SAJU_MATE_MAP[id as SajuMateId];
  }
  return SAJU_MATE_CHARACTERS[0]!;
}

// 오행 상생/상극 관계
const GENERATES: Record<FiveElementKey, FiveElementKey> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

const CONTROLS: Record<FiveElementKey, FiveElementKey> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};

// 천간 → 오행
const STEM_ELEMENT: Record<string, FiveElementKey> = {
  갑: 'wood', 을: 'wood',
  병: 'fire', 정: 'fire',
  무: 'earth', 기: 'earth',
  경: 'metal', 신: 'metal',
  임: 'water', 계: 'water',
};

// 천간합 (가장 강한 끌림)
const STEM_HARMONY: Record<string, string> = {
  갑: '기', 기: '갑',
  을: '경', 경: '을',
  병: '신', 신: '병',
  정: '임', 임: '정',
  무: '계', 계: '무',
};

function hashSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

const VALID_MBTI_SET = new Set([
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]);

export function normalizeMbtiInput(mbti?: string | null): string {
  const cleaned = (mbti || '').trim().toUpperCase();
  if (!cleaned || cleaned === '미입력' || cleaned === '모름' || cleaned === 'NONE') {
    return '';
  }
  return VALID_MBTI_SET.has(cleaned) ? cleaned : '';
}

function mbtiSimilarity(userMbti: string, targetList: string[]): number {
  const clean = (userMbti || '').trim().toUpperCase();
  if (clean.length !== 4) return 0;
  let best = 0;
  for (const t of targetList) {
    if (t === clean) return 10;
    let matches = 0;
    for (let i = 0; i < 4; i++) {
      if (clean[i] === t[i]) matches++;
    }
    best = Math.max(best, matches * 2);
  }
  return best;
}

export interface SajuMateInput {
  birthDate: string;
  birthTime?: string;
  gender?: string;
  mbti?: string;
  dayMasterKorean?: string; // 예: '갑목', '을목', '병화'...
  elementRatio?: Partial<Record<FiveElementKey, number>>;
}

export interface SajuMateMatchResult {
  bestCharacter: SajuMateCharacter;
  worstCharacter: SajuMateCharacter;
  mirrorCharacter: SajuMateCharacter;
  bestScore: number; // 84 ~ 99
  worstAlertScore: number; // 76 ~ 97
  dominantElement: FiveElementKey;
  lackingElement: FiveElementKey;
  dimensions: Array<{ label: string; value: number }>;
}

export function calculateSajuMateMatch(input: SajuMateInput): SajuMateMatchResult {
  const elements: FiveElementKey[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  const ratio: Record<FiveElementKey, number> = {
    wood: Number(input.elementRatio?.wood ?? 20),
    fire: Number(input.elementRatio?.fire ?? 20),
    earth: Number(input.elementRatio?.earth ?? 20),
    metal: Number(input.elementRatio?.metal ?? 20),
    water: Number(input.elementRatio?.water ?? 20),
  };

  const cleanMbti = normalizeMbtiInput(input.mbti);
  const seedBase = `${input.birthDate || '1995-01-01'}:${input.birthTime || '-'}:${input.gender || 'female'}:${cleanMbti || 'NONE'}`;

  const sortedByRatio = [...elements].sort((a, b) => {
    const diff = ratio[b] - ratio[a];
    if (diff !== 0) return diff;
    return hashSeed(`${seedBase}:elem:${a}`) - hashSeed(`${seedBase}:elem:${b}`);
  });
  const dominantElement = sortedByRatio[0] || 'wood';
  const lackingElement = sortedByRatio[sortedByRatio.length - 1] || 'water';
  const secondLacking = sortedByRatio[sortedByRatio.length - 2] || 'earth';

  const stemChar = (input.dayMasterKorean || '').trim().charAt(0);
  const userDayElement: FiveElementKey = STEM_ELEMENT[stemChar] || dominantElement;
  const harmonyStem = STEM_HARMONY[stemChar] || '';

  // 1. Best Match 점수 계산 (부족 오행 보완 + 천간합/상생 + MBTI 공명)
  const bestRanked = SAJU_MATE_CHARACTERS.map((char) => {
    let score = 0;
    if (char.primaryElement === lackingElement) score += 26;
    if (char.secondaryElement === lackingElement) score += 20;
    if (char.primaryElement === secondLacking) score += 14;
    if (GENERATES[char.primaryElement] === userDayElement || GENERATES[userDayElement] === char.primaryElement) {
      score += 16;
    }
    if (harmonyStem && char.affinityStems.includes(harmonyStem)) {
      score += 16;
    }
    if (cleanMbti.length === 4) {
      score += mbtiSimilarity(cleanMbti, char.affinityMbti) * 2.0;
      if (char.clashMbti.includes(cleanMbti)) score -= 12;
    }
    // 결정론적 미세 타이브레이커 (0~11)
    score += hashSeed(`${seedBase}:best:${char.id}`) % 12;
    return { char, score };
  }).sort((a, b) => b.score - a.score);

  const bestCharacter = bestRanked[0]!.char;

  // 2. Worst Match 점수 계산 (일간/오행 상극 + 과다 오행 증폭 + MBTI 충돌)
  const worstRanked = SAJU_MATE_CHARACTERS.filter((c) => c.id !== bestCharacter.id)
    .map((char) => {
      let clash = 0;
      if (CONTROLS[char.primaryElement] === userDayElement || CONTROLS[userDayElement] === char.primaryElement) {
        clash += 32;
      }
      if (char.primaryElement === dominantElement) {
        clash += 24;
      }
      if (char.secondaryElement === dominantElement) {
        clash += 12;
      }
      if (cleanMbti.length === 4) {
        if (char.clashMbti.includes(cleanMbti)) clash += 26;
        else clash += mbtiSimilarity(cleanMbti, char.clashMbti) * 1.5;
      }
      clash += hashSeed(`${seedBase}:worst:${char.id}`) % 11;
      return { char, clash };
    })
    .sort((a, b) => b.clash - a.clash);

  const worstCharacter = worstRanked[0]!.char;

  // 3. Mirror Match (나와 가장 닮은 사주 속 숨은 본캐 — Best/Worst와 반드시 구분)
  const mirrorRanked = SAJU_MATE_CHARACTERS.filter(
    (c) => c.id !== bestCharacter.id && c.id !== worstCharacter.id
  )
    .map((char) => {
      let sim = 0;
      if (char.primaryElement === userDayElement) sim += 30;
      if (char.secondaryElement === userDayElement) sim += 16;
      if (stemChar && char.affinityStems.includes(stemChar)) sim += 22;
      if (char.primaryElement === dominantElement) sim += 14;
      if (cleanMbti.length === 4) {
        sim += mbtiSimilarity(cleanMbti, char.affinityMbti) * 2.2;
      }
      sim += hashSeed(`${seedBase}:mirror:${char.id}`) % 9;
      return { char, sim };
    })
    .sort((a, b) => b.sim - a.sim);

  const mirrorCharacter = mirrorRanked[0]!.char;

  const bestScore = Math.min(
    98,
    Math.max(85, Math.round(74 + Math.min(20, (bestRanked[0]?.score || 50) / 5) + (hashSeed(`${seedBase}:bestScore`) % 5)))
  ); // 85~98
  const worstAlertScore = Math.min(
    96,
    Math.max(78, Math.round(68 + Math.min(22, (worstRanked[0]?.clash || 40) / 4.5) + (hashSeed(`${seedBase}:worstScore`) % 6)))
  ); // 78~96

  const dimensionLabels = ['정서 안정', '티키타카', '신뢰 지수', '현실 시너지', '힐링 케미'];
  const dimensions = dimensionLabels.map((label, idx) => ({
    label,
    value: 74 + (hashSeed(`${seedBase}:dim:${idx}:${bestCharacter.id}`) % 25), // 74~98
  }));

  return {
    bestCharacter,
    worstCharacter,
    mirrorCharacter,
    bestScore,
    worstAlertScore,
    dominantElement,
    lackingElement,
    dimensions,
  };
}

// 결제 전 무료 티저 전용: 실제 캐릭터 정체(ID/이름/이미지)는 노출하지 않고 점수와 오행 힌트만 반환
export function calculateSajuMateTeaser(input: SajuMateInput) {
  const full = calculateSajuMateMatch(input);
  return {
    bestScore: full.bestScore,
    worstAlertScore: full.worstAlertScore,
    dominantElement: full.dominantElement,
    lackingElement: full.lackingElement,
  };
}

// 친구와 나의 말랑 사주 메이트 오행 케미 비교
export function calculateFriendMateChemistry(
  myChar: SajuMateCharacter,
  friendChar: SajuMateCharacter
): { relationLabel: string; score: number; summary: string; badgeClass: string } {
  const pairKey = [myChar.id, friendChar.id].sort().join(':');
  const hash = hashSeed(`friend-chem:${pairKey}`);
  const myElementKo = ELEMENT_LABELS[myChar.primaryElement].ko;
  const friendElementKo = ELEMENT_LABELS[friendChar.primaryElement].ko;

  if (
    GENERATES[myChar.primaryElement] === friendChar.primaryElement ||
    GENERATES[friendChar.primaryElement] === myChar.primaryElement
  ) {
    return {
      relationLabel: '오행 상생 찰떡 케미',
      score: 91 + (hash % 8),
      summary: `${myChar.name}(${myElementKo})와 ${friendChar.name}(${friendElementKo})는 서로의 기운을 자연스럽게 북돋워 주는 오행 상생 관계예요. 함께할수록 부족한 에너지는 채우고 강점은 배가되는 이상적인 단짝 케미를 자랑합니다.`,
      badgeClass: 'bg-emerald-100 text-emerald-800',
    };
  }

  if (myChar.primaryElement === friendChar.primaryElement) {
    return {
      relationLabel: '같은 결 · 텔레파시 단짝',
      score: 86 + (hash % 8),
      summary: `같은 ${myElementKo} 기운을 나란히 품은 ${myChar.name}과 ${friendChar.name}는 말하지 않아도 속마음이 통하는 비화 동료 사이예요. 가치관과 리듬이 닮아 편하게 오래 곁을 지킬 수 있는 찰떡 친구입니다.`,
      badgeClass: 'bg-sky-100 text-sky-800',
    };
  }

  return {
    relationLabel: '밀당 스파크 · 반전 시너지',
    score: 76 + (hash % 9),
    summary: `${myChar.name}(${myElementKo})와 ${friendChar.name}(${friendElementKo})는 서로 다른 결로 기분 좋은 자극을 주고받는 상극·보완 관계예요. 가끔 투닥거려도 나에게 없는 관점을 열어주며 균형을 잡아주는 반전 시너지 파트너입니다.`,
    badgeClass: 'bg-amber-100 text-amber-800',
  };
}
