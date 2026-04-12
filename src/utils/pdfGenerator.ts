import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * PDF를 생성합니다.
 * - 스크롤 안에 있는 UI가 온전히 캡처되도록 요소를 복제하여 전체 형태로 렌더링 후 캡처
 * - 페이지 중간에 내용이 잘리지 않도록 (페이지 잘림 방지), 
 *   콘텐츠 길이에 딱 맞춘 단일 페이지(One-page) 형태의 PDF로 생성합니다.
 */
export const generatePDF = async (element: HTMLElement, fileName: string) => {
    let clone: HTMLElement | null = null;
    try {
        // 1. 요소 전체 캡처를 완벽히 하기 위해 복제본 생성
        clone = element.cloneNode(true) as HTMLElement;
        document.body.appendChild(clone);

        // 오프스크린에서 전체 높이로 렌더링되도록 스타일 강제화
        clone.style.position = 'absolute';
        clone.style.top = '0';
        clone.style.left = '-9999px';
        clone.style.width = '800px'; // A4 가로 비율에 적합한 픽셀 폭
        clone.style.height = 'max-content';
        clone.style.overflow = 'visible';
        clone.style.zIndex = '-9999';

        // Apply PDF-specific styles to force readability
        clone.classList.add('pdf-report-container');
        const style = document.createElement('style');
        style.id = 'pdf-report-print-style';
        style.innerHTML = `
            .pdf-report-container, .pdf-report-container * {
                color: #000000 !important;
                background-color: #ffffff !important;
                text-shadow: none !important;
                box-shadow: none !important;
                border-color: #eeeeee !important;
                -webkit-print-color-adjust: exact;
                letter-spacing: normal !important;
                opacity: 1 !important;
                visibility: visible !important;
            }
            .pdf-report-container img {
                background-color: transparent !important;
            }
        `;
        document.head.appendChild(style);
        
        // Wait briefly for style application (Critical for mobile/Safari)
        await new Promise(resolve => setTimeout(resolve, 200));

        // 2. 고해상도 전체 요소 캡처 (스크롤/숨겨진 영역 문제 해결)
        const canvas = await html2canvas(clone, {
            scale: 3,            // 선명도 극대화를 위해 x3
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 800,
            imageTimeout: 15000,
        });

        // 3. 다 쓴 복제본 및 스타일 정리
        if (clone) {
            document.body.removeChild(clone);
            clone = null;
        }
        const insertedStyle = document.getElementById('pdf-report-print-style');
        if (insertedStyle) insertedStyle.remove();

        const ctxWidth = canvas.width;
        const ctxHeight = canvas.height;

        // 4. 단일 페이지 PDF (콘텐츠 길이에 딱 맞춘 커스텀 사이즈)
        // PDF 폭을 A4 기준 210mm로 잡고, 높이는 캔버스 비율에 맞춥니다.
        const pdfPageWidth = 210;
        const pdfPageHeight = (ctxHeight * pdfPageWidth) / ctxWidth;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pdfPageWidth, pdfPageHeight],
            compress: true,
        });

        const imgData = canvas.toDataURL('image/png');

        // 여백 없이 전체 페이지를 덮도록 생성 (또는 약간의 여백 추가)
        const MARGIN_MM = 12;
        const drawWidth = pdfPageWidth - MARGIN_MM * 2;
        const drawHeight = (ctxHeight * drawWidth) / ctxWidth;

        // 배경 하얗게 칠하기
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfPageWidth, pdfPageHeight, 'F');

        // 이미지 삽입
        pdf.addImage(
            imgData,
            'PNG',
            MARGIN_MM,
            MARGIN_MM,
            drawWidth,
            drawHeight,
            undefined,
            'FAST'
        );

        // 페이지 하단 워터마크
        pdf.setFontSize(8);
        pdf.setTextColor(180, 180, 180);
        pdf.text(
            'MBTIJU Soul Report  -  mbtiju.com',
            pdfPageWidth / 2,
            pdfPageHeight - 6,
            { align: 'center' }
        );

        pdf.save(`${fileName}.pdf`);

        // 메모리 정리
        canvas.width = 0;
        canvas.height = 0;

        return true;
    } catch (error) {
        if (clone && clone.parentNode) {
            clone.parentNode.removeChild(clone);
        }
        const insertedStyle = document.getElementById('pdf-report-print-style');
        if (insertedStyle) insertedStyle.remove();
        
        console.error('PDF Generation Error:', error);
        throw error;
    }
};
