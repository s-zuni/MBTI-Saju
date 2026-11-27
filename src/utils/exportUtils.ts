import html2canvas from 'html2canvas';

export interface ShareImageOptions {
    title?: string;
    text?: string;
}

/**
 * 특정 HTML 요소를 이미지(PNG)로 캡처하여 디바이스 네이티브 공유(인스타 스토리 등)를 띄우거나 기기에 저장(다운로드)합니다.
 * @param element 캡처할 요소
 * @param fileName 저장할 파일 이름
 * @param scale 선명도를 위한 스케일링 (기본값: 3)
 * @param shareOptions Web Share API 공유 시 사용할 제목/본문 옵션
 */
export const generateImage = async (
    element: HTMLElement,
    fileName: string,
    scale: number = 3,
    shareOptions?: ShareImageOptions
): Promise<boolean> => {
    try {
        if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
            await (document as any).fonts.ready.catch(() => undefined);
        }

        const imgs = Array.from(element.querySelectorAll('img'));
        await Promise.all(
            imgs.map((img) =>
                img.complete && img.naturalWidth > 0
                    ? typeof img.decode === 'function'
                        ? img.decode().catch(() => undefined)
                        : Promise.resolve()
                    : new Promise<void>((res) => {
                          const done = () => res();
                          img.addEventListener('load', done, { once: true });
                          img.addEventListener('error', done, { once: true });
                          setTimeout(done, 4000);
                      })
            )
        );

        const width = element.offsetWidth || 1080;
        const height = element.offsetHeight || 1920;
        const maxPixels = 12_000_000;
        const safeScale =
            width * scale * height * scale > maxPixels
                ? Math.max(1, Math.sqrt(maxPixels / (width * height)))
                : scale;

        const canvas = await html2canvas(element, {
            scale: safeScale,
            useCORS: true,
            logging: false,
            backgroundColor: null, // 투명 배경 유지 시도
            windowWidth: width,
            windowHeight: height,
            scrollX: 0,
            scrollY: 0,
            imageTimeout: 15000,
        });

        return new Promise((resolve, reject) => {
            // 캔버스를 Blob으로 변환하여 파일 생성 준비
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    reject(new Error('Canvas to Blob conversion failed'));
                    return;
                }

                try {
                    const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

                    // 모바일 Web Share API 지원 확인 (파일 포함 공유가 가능한지 체크)
                    // 이 API를 통하면 인스타그램 스토리 앱으로 직접 이미지를 보낼 수 있습니다.
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                files: [file],
                                title: shareOptions?.title || 'MBTIJU 분석 결과',
                                text: shareOptions?.text || 'MBTIJU에서 확인한 나만의 사주·성향 분석 결과입니다.'
                            });
                            
                            // 메모리 정리
                            canvas.width = 0;
                            canvas.height = 0;
                            resolve(true);
                            return;
                        } catch (shareError: any) {
                            console.log('Share canceled or failed:', shareError);
                            // 사용자가 브라우저 공유창을 그냥 닫은 경우 에러가 나지만 무시하고 다운로드로 넘어갈 수도 있습니다.
                            // 여기서는 일단 에러 로그만 찍고 fallback 으로 직접 다운로드 처리합니다.
                        }
                    }

                    // Web Share 기능이 없거나 (데스크탑), 공유 과정이 실패/취소된 경우 
                    // 안전하게 기기(사진첩/다운로드 폴더)에 저장하는 것으로 Fallback 합니다.
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${fileName}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    // 메모리 정리
                    canvas.width = 0;
                    canvas.height = 0;
                    
                    resolve(true);
                } catch (e) {
                    reject(e);
                }
            }, 'image/png', 1.0);
        });
    } catch (error) {
        console.error('Image Generation Error:', error);
        throw error;
    }
};
