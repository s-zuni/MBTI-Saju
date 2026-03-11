import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async (element: HTMLElement, fileName: string) => {
    try {
        const MARGIN_MM = 15; // 상하좌우 여백 (mm)
        
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // 콘텐츠가 표시될 실제 영역 (여백 제외)
        const contentWidth = pdfWidth - (MARGIN_MM * 2);
        const contentHeight = pdfHeight - (MARGIN_MM * 2);

        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = contentWidth;
        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 0;

        // 첫 페이지 여백 및 콘텐츠 추가
        pdf.addImage(
            imgData, 
            'PNG', 
            MARGIN_MM, 
            MARGIN_MM, // 첫 페이지는 항상 상단 여백에서 시작 
            imgWidth, 
            imgHeight
        );
        heightLeft -= contentHeight;

        // 남은 높이가 있으면 새 페이지 추가
        while (heightLeft > 0) {
            position = heightLeft - imgHeight + MARGIN_MM;
            pdf.addPage();
            pdf.addImage(
                imgData, 
                'PNG', 
                MARGIN_MM, 
                position, 
                imgWidth, 
                imgHeight
            );
            heightLeft -= contentHeight;
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
