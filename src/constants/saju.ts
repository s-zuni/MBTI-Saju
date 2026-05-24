export const ELEMENT_STYLES: Record<string, string> = {
  wood: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  fire: 'bg-rose-50 text-rose-700 border-rose-100',
  earth: 'bg-amber-50 text-amber-700 border-amber-100',
  metal: 'bg-slate-50 text-slate-700 border-slate-200',
  water: 'bg-blue-50 text-blue-700 border-blue-100',
  default: 'bg-slate-50 text-slate-400 border-slate-100'
};

export const GAN_INFO: Record<string, { element: string; name: string }> = {
  '甲': { element: 'wood', name: '갑목' }, '乙': { element: 'wood', name: '을목' },
  '丙': { element: 'fire', name: '병화' }, '丁': { element: 'fire', name: '정화' },
  '戊': { element: 'earth', name: '무토' }, '己': { element: 'earth', name: '기토' },
  '庚': { element: 'metal', name: '경금' }, '辛': { element: 'metal', name: '신금' },
  '壬': { element: 'water', name: '임수' }, '癸': { element: 'water', name: '계수' },
};

export const ZHI_INFO: Record<string, { element: string; name: string }> = {
  '子': { element: 'water', name: '자수' }, '丑': { element: 'earth', name: '축토' },
  '寅': { element: 'wood', name: '인목' }, '卯': { element: 'wood', name: '묘목' },
  '辰': { element: 'earth', name: '진토' }, '巳': { element: 'fire', name: '사화' },
  '午': { element: 'fire', name: '오화' }, '未': { element: 'earth', name: '미토' },
  '申': { element: 'metal', name: '신금' }, '酉': { element: 'metal', name: '유금' },
  '戌': { element: 'earth', name: '술토' }, '亥': { element: 'water', name: '해수' },
};

export const SHISHEN_MAP: Record<string, string> = {
  '比肩': '비견', '劫財': '겁재', '劫财': '겁재', '食神': '식신', '傷官': '상관', '伤官': '상관',
  '偏財': '편재', '偏财': '편재', '正財': '정재', '正财': '정재', '偏官': '편관', '七殺': '편관',
  '正官': '정관', '偏印': '편인', '正印': '정인'
};

export const SHISHEN_COLORS: Record<string, string> = {
  '비견': 'text-rose-600 bg-rose-50',
  '겁재': 'text-rose-500 bg-rose-50/50',
  '식신': 'text-orange-600 bg-orange-50',
  '상관': 'text-orange-500 bg-orange-50/50',
  '편재': 'text-amber-600 bg-amber-50',
  '정재': 'text-amber-500 bg-amber-50/50',
  '편관': 'text-emerald-700 bg-emerald-50',
  '정관': 'text-emerald-600 bg-emerald-50/50',
  '편인': 'text-slate-700 bg-slate-100',
  '정인': 'text-slate-600 bg-slate-100/50',
  'default': 'text-slate-500 bg-slate-50'
};

export const translateShiShen = (s: any) => {
  if (!s || s === '-') return '-';
  
  // Handle array returned by lunar-javascript's get[..]ShiShenZhi()
  let result = Array.isArray(s) ? s.join('') : String(s);
  if (!result || result === '-') return '-';
  
  Object.entries(SHISHEN_MAP).forEach(([zh, ko]) => {
    result = result.replace(new RegExp(zh, 'g'), ko + ' ');
  });
  return result.trim().replace(/\s+/g, ', ');
};

export const getShiShenStyle = (s: string | undefined): string => {
  if (!s) return SHISHEN_COLORS.default as string;
  const ko = translateShiShen(s).split(',')[0]; // Use the first one for color color if multiple
  return (SHISHEN_COLORS[ko || ''] || SHISHEN_COLORS.default) as string;
};

export const formatHiddenStems = (stems: string[] | undefined) => {
  if (!stems || stems.length === 0) return '-';
  return stems.map(s => {
    const info = GAN_INFO[s];
    return info ? info.name.substring(0, 1) : s;
  }).join(', ');
};
