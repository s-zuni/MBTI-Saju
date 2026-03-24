/**
 * 텍스트에서 마크다운 볼드 기호(**) 및 언더바(__)를 제거합니다.
 */
export const stripMarkdown = (text: any): string => {
    if (typeof text !== 'string') return text;
    // ** 및 __ 제거
    return text.replace(/\*\*/g, '').replace(/__/g, '');
};
