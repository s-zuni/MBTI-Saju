import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { pdf } from '@react-pdf/renderer';
import React from 'react';

/**
 * Generates a high-quality PDF using @react-pdf/renderer.
 * 
 * @param component The React-PDF component (Document)
 * @param filename The output PDF filename
 */
export const generateReactPDF = async (component: React.ReactElement, filename: string) => {
  try {
    const blob = await pdf(component).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('React-PDF Generation Error:', error);
    throw error;
  }
};

/**
 * Generates a high-quality PDF from a target DOM element.
 * 
 * @param element The ReactDOM element to capture (e.g. standard A4 page wrapper)
 * @param filename The output PDF filename
 */
export const generateHighResPDF = async (element: HTMLElement, filename: string) => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pages = element.querySelectorAll('.pdf-page');
    
    if (pages.length === 0) {
      // Fallback if no .pdf-page classes found
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      pdf.save(filename);
      return true;
    }

    for (let i = 0; i < pages.length; i++) {
      const pageElement = pages[i] as HTMLElement;
      
      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794, // Fixed A4 width at 96 DPI
        height: 1123, // Fixed A4 height at 96 DPI
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
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
