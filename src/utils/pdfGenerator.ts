import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const A4_WIDTH_PX = 1240;  // ~210mm at 150dpi
const A4_HEIGHT_PX = 1754; // ~297mm at 150dpi
const MARGIN_PX = 60;

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

        // 2. 전체 요소를 고해상도로 캡처
        const canvas = await html2canvas(element, {
            scale: 2,            // 고해상도 (Retina)
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: element.offsetWidth,
            // 전체 스크롤 높이로 캡처
            height: element.scrollHeight,
            windowHeight: element.scrollHeight,
            scrollY: -window.scrollY,
        });

        const ctxWidth = canvas.width;
        const ctxHeight = canvas.height;

        // 3. PDF 페이지 콘텐츠 영역 픽셀 높이 계산
        // (mm -> pixel 비율: pdfWidthMm : ctxWidth = contentHeightMm : pageHeightInPx)
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

            // 원본 canvas에서 해당 슬라이스 복사
            ctx.drawImage(
                canvas,
                0, yOffset,          // 소스 시작점
                ctxWidth, sliceHeight, // 소스 크기
                0, 0,               // 대상 시작점
                ctxWidth, sliceHeight  // 대상 크기
            );

            const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
            const sliceHeightMm = sliceHeight * scaleRatio;

            pdf.addImage(
                sliceImgData,
                'JPEG',
                MARGIN_MM,
                MARGIN_MM,
                contentWidthMm,
                sliceHeightMm
            );

            // 페이지 번호 표시 (하단)
            const currentPage = pdf.getNumberOfPages();
            pdf.setFontSize(8);
            pdf.setTextColor(180, 180, 180);
            pdf.text(
                `MBTIJU 소울 리포트  ${currentPage}`,
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
