import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Generates a high-quality PDF from a target DOM element.
 * 
 * @param element The ReactDOM element to capture (e.g. standard A4 page wrapper)
 * @param filename The output PDF filename
 */
export const generateHighResPDF = async (element: HTMLElement, filename: string) => {
  try {
    // 1. Capture the exact dimensions of the A4 element wrapper
    // DeepReportPDFTemplate wraps items into a single container
    
    // Scale 2 is usually enough for retina displays. 
    // Setting too high might crash the browser due to canvas memory limits if there are many pages.
    const canvas = await html2canvas(element, {
      scale: 2, 
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      y: window.scrollY,
      x: window.scrollX,
      // We don't want to capture scrollbars if any
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight,
      onclone: (clonedDoc) => {
        // Any specific clone manipulations can be done here.
        // E.g., making sure hidden things are visible in the clone
        const target = clonedDoc.getElementById(element.id);
        if (target) {
            target.style.display = 'block';
            target.style.position = 'relative';
            target.style.left = '0';
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // 2. Initialize jsPDF
    // We captured the entire template which might contain multiple A4-sized div blocks.
    // An A4 is 210mm x 297mm.
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // Should be ~210
    const pdfHeight = pdf.internal.pageSize.getHeight(); // Should be ~297

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const imgWidth = pdfWidth;
    const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

    let heightLeft = imgHeight;
    let position = 0;

    // 3. Add pages
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      // Precision margin to avoid blank extra page
      if (heightLeft > 5) { 
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      }
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('HighRes PDF Generation Error:', error);
    throw error;
  }
};

/**
 * Basic PDF generation for standard components.
 * Restores the generatePDF function to prevent broken imports.
 */
export const generatePDF = async (element: HTMLElement, filename: string) => {
  try {
    const canvas = await html2canvas(element, { 
      scale: 2, 
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};
