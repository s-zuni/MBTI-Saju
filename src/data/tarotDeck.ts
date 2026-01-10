export interface TarotCard {
    id: number;
    name: string;
    name_ko: string;
    image: string; // Placeholder or file path
    keywords: string[];
}

export const TAROT_DECK: TarotCard[] = [
    { id: 0, name: "The Fool", name_ko: "광대", image: "fool", keywords: ["시작", "자유", "순수"] },
    { id: 1, name: "The Magician", name_ko: "마법사", image: "magician", keywords: ["창조", "능력", "자신감"] },
    { id: 2, name: "The High Priestess", name_ko: "여사제", image: "priestess", keywords: ["지혜", "직관", "신비"] },
    { id: 3, name: "The Empress", name_ko: "여황제", image: "empress", keywords: ["풍요", "모성", "매력"] },
    { id: 4, name: "The Emperor", name_ko: "황제", image: "emperor", keywords: ["권위", "안정", "책임"] },
    { id: 5, name: "The Hierophant", name_ko: "교황", image: "hierophant", keywords: ["전통", "조언", "교육"] },
    { id: 6, name: "The Lovers", name_ko: "연인", image: "lovers", keywords: ["사랑", "선택", "조화"] },
    { id: 7, name: "The Chariot", name_ko: "전차", image: "chariot", keywords: ["승리", "의지", "전진"] },
    { id: 8, name: "Strength", name_ko: "힘", image: "strength", keywords: ["인내", "용기", "포용"] },
    { id: 9, name: "The Hermit", name_ko: "은둔자", image: "hermit", keywords: ["탐구", "고독", "성찰"] },
    { id: 10, name: "Wheel of Fortune", name_ko: "운명의 수레바퀴", image: "wheel", keywords: ["변화", "운명", "기회"] },
    { id: 11, name: "Justice", name_ko: "정의", image: "justice", keywords: ["공정", "균형", "책임"] },
    { id: 12, name: "The Hanged Man", name_ko: "매달린 사람", image: "hanged_man", keywords: ["희생", "관점 전환", "정체"] },
    { id: 13, name: "Death", name_ko: "죽음", image: "death", keywords: ["끝", "새로운 시작", "변화"] },
    { id: 14, name: "Temperance", name_ko: "절제", image: "temperance", keywords: ["중용", "조화", "인내"] },
    { id: 15, name: "The Devil", name_ko: "악마", image: "devil", keywords: ["속박", "유혹", "집착"] },
    { id: 16, name: "The Tower", name_ko: "탑", image: "tower", keywords: ["갑작스런 변화", "붕괴", "재건"] },
    { id: 17, name: "The Star", name_ko: "별", image: "star", keywords: ["희망", "영감", "치유"] },
    { id: 18, name: "The Moon", name_ko: "달", image: "moon", keywords: ["불안", "무의식", "혼란"] },
    { id: 19, name: "The Sun", name_ko: "태양", image: "sun", keywords: ["성공", "활력", "기쁨"] },
    { id: 20, name: "Judgement", name_ko: "심판", image: "judgement", keywords: ["부활", "결단", "깨달음"] },
    { id: 21, name: "The World", name_ko: "세계", image: "world", keywords: ["완성", "통합", "성취"] }
];
