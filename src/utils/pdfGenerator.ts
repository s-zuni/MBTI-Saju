import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


/**
 * PDF를 생성합니다.
 * - 콘텐츠를 스크롤 가능한 전체 높이로 캡처
 * - 각 A4 페이지에 정확히 나뉘어 출력
 * - 콘텐츠 중간에 페이지가 잘리지 않도록 섹션 단위로 페이지 나눔
 */
export const generatePDF = async (element: HTMLElement, fileName: string) => {
    try {
        // 1. A4 PDF 문서 설정
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true,
        });

        const pdfPageWidth = pdf.internal.pageSize.getWidth();   // 210mm
        const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm
        const MARGIN_MM = 12;   // 상하좌우 여백 (mm)
        const contentWidthMm = pdfPageWidth - MARGIN_MM * 2;
        const contentHeightMm = pdfPageHeight - MARGIN_MM * 2;

        // Apply PDF-specific styles to force readability
        element.classList.add('pdf-report-container');
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
        await new Promise(resolve => setTimeout(resolve, 150));

        // 2. 고해상도 전체 요소 캡처
        const canvas = await html2canvas(element, {
            scale: 3,            // 선명도 극대화를 위해 x3
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 800,     // A4 가로 비율에 최적화된 고정폭
            height: element.scrollHeight,
            windowHeight: element.scrollHeight,
            scrollY: -window.scrollY,
            imageTimeout: 15000,
        });

        // Remove PDF-specific styles immediately after capture to restore UI
        element.classList.remove('pdf-report-container');
        const insertedStyle = document.getElementById('pdf-report-print-style');
        if (insertedStyle) {
            insertedStyle.remove();
        }

        const ctxWidth = canvas.width;
        const ctxHeight = canvas.height;

        // 3. PDF 페이지 콘텐츠 영역 픽셀 높이 계산
        const scaleRatio = contentWidthMm / ctxWidth;
        const contentHeightPx = contentHeightMm / scaleRatio;

        let yOffset = 0;   // 현재 캡처 시작 Y 픽셀
        let isFirstPage = true;

        // 4. 페이지 단위로 슬라이스하여 PDF에 삽입
        while (yOffset < ctxHeight) {
            if (!isFirstPage) {
                pdf.addPage();
            }
            isFirstPage = false;

            // 이번 페이지에 들어갈 높이
            const sliceHeight = Math.min(contentHeightPx, ctxHeight - yOffset);

            // 슬라이스 캔버스 생성
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = ctxWidth;
            sliceCanvas.height = sliceHeight;
            const ctx = sliceCanvas.getContext('2d');
            if (!ctx) break;
            
            // Critical for sharp text: Disable smoothing when copying from the high-res source
            ctx.imageSmoothingEnabled = false;

            // 원본 canvas에서 해당 슬라이스 복사
            ctx.drawImage(
                canvas,
                0, yOffset,          // 소스 시작점
                ctxWidth, sliceHeight, // 소스 크기
                0, 0,               // 대상 시작점
                ctxWidth, sliceHeight  // 대상 크기
            );

            // Use PNG for pixel-perfect text rendering (crisper than JPEG)
            // If file size is an issue, 'image/jpeg' with quality 1.0 is the fallback.
            const sliceImgData = sliceCanvas.toDataURL('image/png');
            const sliceHeightMm = sliceHeight * scaleRatio;

            pdf.addImage(
                sliceImgData,
                'PNG',
                MARGIN_MM,
                MARGIN_MM,
                contentWidthMm,
                sliceHeightMm,
                undefined,
                'FAST' // Speed up generation
            );

            // 페이지 번호 표시 (하단)
            const currentPage = pdf.getNumberOfPages();
            pdf.setFontSize(8);
            pdf.setTextColor(180, 180, 180);
            pdf.text(
                `MBTIJU Soul Report  ${currentPage}`,
                pdfPageWidth / 2,
                pdfPageHeight - 6,
                { align: 'center' }
            );

            yOffset += contentHeightPx;
        }

        pdf.save(`${fileName}.pdf`);

        // 메모리 정리
        canvas.width = 0;
        canvas.height = 0;

        return true;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
};
