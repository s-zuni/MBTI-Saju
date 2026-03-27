/**
 * 텍스트에서 마크다운 볼드 기호(**) 및 언더바(__)를 제거합니다.
 */
export const stripMarkdown = (text: any): string => {
    if (typeof text !== 'string') return text;
    // ** 및 __ 제거
    return text.replace(/\*\*/g, '').replace(/__/g, '');
};

/**
 * Safari 브라우저의 Date 파싱 호환성을 위해 날짜 문자열을 변환합니다.
 * "2024-03-25 14:30:00" -> "2024-03-25T14:30:00"
 */
export const formatSafariDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
        // 공백을 T로 치환하여 ISO 8601 포맷으로 변환 (Safari 호환성 핵심)
        const safeDateString = dateString.replace(' ', 'T');
        const date = new Date(safeDateString);
        
        // Invalid Date 체크
        if (isNaN(date.getTime())) {
            return dateString; // 변환 실패 시 원본 반환 (최후의 수단)
        }
        
        return safeDateString;
    } catch (e) {
        return dateString || '';
    }
};
