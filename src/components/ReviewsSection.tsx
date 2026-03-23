import React from 'react';
import { Star, Quote } from 'lucide-react';

const reviews = [
    {
        name: '정*민',
        rating: 5,
        content: 'MBTI랑 사주가 이렇게 잘 맞을 줄은 몰랐어요. 단순한 재미인 줄 알았는데 분석 내용이 정말 깊이 있고 정확해서 놀랐습니다.',
        service: '융합분석',
        date: '2026.03.20'
    },
    {
        name: '김*현',
        rating: 5,
        content: '올해 이직 문제로 고민이 많았는데, 커리어 전략 분석 보고 큰 용기를 얻었습니다. 구체적인 방향성을 제시해줘서 많은 도움이 되었어요.',
        service: '직업운 컨설팅',
        date: '2026.03.18'
    },
    {
        name: '최*아',
        rating: 5,
        content: '남자친구랑 궁합 봤는데, 저희 둘의 성향 차이를 정확히 짚어내더라고요. 서로를 더 이해하는 계기가 되었습니다. 강력 추천해요!',
        service: '궁합 진단',
        date: '2026.03.15'
    }
];

const ReviewsSection: React.FC = () => {
    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="section-container relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">베스트 이용 후기</h2>
                    <p className="text-slate-500 font-medium tracking-tight">이미 많은 분들이 자신의 운명을 확인하고 새로운 통찰을 얻으셨습니다.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {reviews.map((review, i) => (
                        <div 
                            key={i} 
                            className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 hover:border-indigo-100 hover:bg-white hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 group"
                        >
                            <div className="flex gap-1 mb-6">
                                {[...Array(review.rating)].map((_, j) => (
                                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                ))}
                            </div>
                            
                            <div className="relative">
                                <Quote className="absolute -top-4 -left-2 w-8 h-8 text-indigo-500/10" />
                                <p className="text-slate-700 leading-relaxed font-medium mb-6 relative z-10">
                                    "{review.content}"
                                </p>
                            </div>

                            <div className="flex justify-between items-end border-t border-slate-100 pt-6">
                                <div>
                                    <p className="font-black text-slate-950 text-sm mb-0.5">{review.name}님</p>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{review.service}</p>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">{review.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ReviewsSection;
