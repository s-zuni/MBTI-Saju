import img_fool from '../assets/tarot/fool.jpg';
import img_magician from '../assets/tarot/magician.jpg';
import img_priestess from '../assets/tarot/priestess.jpg';
import img_empress from '../assets/tarot/empress.jpg';
import img_emperor from '../assets/tarot/emperor.jpg';
import img_hierophant from '../assets/tarot/hierophant.jpg';
import img_lovers from '../assets/tarot/lovers.jpg';
import img_chariot from '../assets/tarot/chariot.jpg';
import img_strength from '../assets/tarot/strength.jpg';
import img_hermit from '../assets/tarot/hermit.jpg';
import img_wheel from '../assets/tarot/wheel.jpg';
import img_justice from '../assets/tarot/justice.jpg';
import img_hanged_man from '../assets/tarot/hanged_man.jpg';
import img_death from '../assets/tarot/death.jpg';
import img_temperance from '../assets/tarot/temperance.jpg';
import img_devil from '../assets/tarot/devil.jpg';
import img_tower from '../assets/tarot/tower.jpg';
import img_star from '../assets/tarot/star.jpg';
import img_moon from '../assets/tarot/moon.jpg';
import img_sun from '../assets/tarot/sun.jpg';
import img_judgement from '../assets/tarot/judgement.jpg';
import img_world from '../assets/tarot/world.jpg';

export interface TarotCard {
    id: number;
    name: string;
    name_ko: string;
    image: string; // 카드 일러스트 (라이더-웨이트-스미스 덱, 1909, 퍼블릭 도메인)
    keywords: string[];
}

export const TAROT_DECK: TarotCard[] = [
    { id: 0, name: "The Fool", name_ko: "광대", image: img_fool, keywords: ["시작", "자유", "순수"] },
    { id: 1, name: "The Magician", name_ko: "마법사", image: img_magician, keywords: ["창조", "능력", "자신감"] },
    { id: 2, name: "The High Priestess", name_ko: "여사제", image: img_priestess, keywords: ["지혜", "직관", "신비"] },
    { id: 3, name: "The Empress", name_ko: "여황제", image: img_empress, keywords: ["풍요", "모성", "매력"] },
    { id: 4, name: "The Emperor", name_ko: "황제", image: img_emperor, keywords: ["권위", "안정", "책임"] },
    { id: 5, name: "The Hierophant", name_ko: "교황", image: img_hierophant, keywords: ["전통", "조언", "교육"] },
    { id: 6, name: "The Lovers", name_ko: "연인", image: img_lovers, keywords: ["사랑", "선택", "조화"] },
    { id: 7, name: "The Chariot", name_ko: "전차", image: img_chariot, keywords: ["승리", "의지", "전진"] },
    { id: 8, name: "Strength", name_ko: "힘", image: img_strength, keywords: ["인내", "용기", "포용"] },
    { id: 9, name: "The Hermit", name_ko: "은둔자", image: img_hermit, keywords: ["탐구", "고독", "성찰"] },
    { id: 10, name: "Wheel of Fortune", name_ko: "운명의 수레바퀴", image: img_wheel, keywords: ["변화", "운명", "기회"] },
    { id: 11, name: "Justice", name_ko: "정의", image: img_justice, keywords: ["공정", "균형", "책임"] },
    { id: 12, name: "The Hanged Man", name_ko: "매달린 사람", image: img_hanged_man, keywords: ["희생", "관점 전환", "정체"] },
    { id: 13, name: "Death", name_ko: "죽음", image: img_death, keywords: ["끝", "새로운 시작", "변화"] },
    { id: 14, name: "Temperance", name_ko: "절제", image: img_temperance, keywords: ["중용", "조화", "인내"] },
    { id: 15, name: "The Devil", name_ko: "악마", image: img_devil, keywords: ["속박", "유혹", "집착"] },
    { id: 16, name: "The Tower", name_ko: "탑", image: img_tower, keywords: ["갑작스런 변화", "붕괴", "재건"] },
    { id: 17, name: "The Star", name_ko: "별", image: img_star, keywords: ["희망", "영감", "치유"] },
    { id: 18, name: "The Moon", name_ko: "달", image: img_moon, keywords: ["불안", "무의식", "혼란"] },
    { id: 19, name: "The Sun", name_ko: "태양", image: img_sun, keywords: ["성공", "활력", "기쁨"] },
    { id: 20, name: "Judgement", name_ko: "심판", image: img_judgement, keywords: ["부활", "결단", "깨달음"] },
    { id: 21, name: "The World", name_ko: "세계", image: img_world, keywords: ["완성", "통합", "성취"] }
];
