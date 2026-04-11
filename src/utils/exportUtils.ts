import html2canvas from 'html2canvas';

/**
 * 특정 HTML 요소를 이미지(PNG)로 캡처하여 다운로드합니다.
 * @param element 캡처할 요소
 * @param fileName 저장할 파일 이름
 * @param scale 선명도를 위한 스케일링 (기본값: 3)
 */
export const generateImage = async (element: HTMLElement, fileName: string, scale: number = 3) => {
    try {
        // 스타일 강제 적용 (캡처 시점에만)
        const originalStyle = element.getAttribute('style') || '';
        
        const canvas = await html2canvas(element, {
            scale: scale,
            useCORS: true,
            logging: false,
            backgroundColor: null, // 투명 배경 유지 시도
            windowWidth: element.offsetWidth,
            windowHeight: element.offsetHeight,
            scrollY: -window.scrollY,
            imageTimeout: 15000,
        });

        // 캔버스를 이미지 데이터로 변환
        const imgData = canvas.toDataURL('image/png');
        
        // 다운로드 링크 생성
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 메모리 정리
        canvas.width = 0;
        canvas.height = 0;

        return true;
    } catch (error) {
        console.error('Image Generation Error:', error);
        throw error;
    }
};
