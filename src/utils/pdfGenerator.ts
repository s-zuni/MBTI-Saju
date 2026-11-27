import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { pdf } from '@react-pdf/renderer';
import React from 'react';

function escapeHtml(value: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PdfReportOptions {
  reportTitle?: string;
  reportSubtitle?: string;
}

/**
 * Generates a high-quality PDF using @react-pdf/renderer.
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error('React-PDF Generation Error:', error);
    throw error;
  }
};

/**
 * Generates a high-quality PDF from a target DOM element (.pdf-page pages).
 */
export const generateHighResPDF = async (element: HTMLElement, filename: string) => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pages = element.querySelectorAll('.pdf-page');

    if (pages.length === 0) {
      return await generatePDF(element, filename);
    }

    for (let i = 0; i < pages.length; i++) {
      const pageElement = pages[i] as HTMLElement;

      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      if (i > 0) doc.addPage();
      doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('HighRes PDF Generation Error:', error);
    throw error;
  }
};

async function waitForPdfAssets(element: HTMLElement): Promise<void> {
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
}

/**
 * 캔버스의 픽셀 데이터에서 행(row)이 글자 없이 여백/구분선인지 판별한다.
 * 반환값: 2 = 순백 배경 여백, 1 = 카드 내부 등 균일한 단색 여백(문단 사이), 0 = 글자/요소가 지나가는 행
 */
function classifyCanvasRow(
  data: Uint8ClampedArray,
  rowOffset: number,
  width: number
): 0 | 1 | 2 {
  const step = Math.max(1, Math.floor(width / 160));
  const bgR = data[rowOffset]!;
  const bgG = data[rowOffset + 1]!;
  const bgB = data[rowOffset + 2]!;

  let nonWhiteCount = 0;
  let nonUniformCount = 0;
  let samples = 0;

  for (let x = 8; x < width - 8; x += step) {
    const idx = rowOffset + x * 4;
    const r = data[idx]!;
    const g = data[idx + 1]!;
    const b = data[idx + 2]!;
    samples++;

    if (r < 244 || g < 244 || b < 244) {
      nonWhiteCount++;
    }
    if (Math.abs(r - bgR) > 12 || Math.abs(g - bgG) > 12 || Math.abs(b - bgB) > 12) {
      nonUniformCount++;
    }
  }

  if (samples === 0) return 2;
  if (nonWhiteCount <= Math.floor(samples * 0.01)) return 2;
  if (nonUniformCount <= Math.floor(samples * 0.015)) return 1;
  return 0;
}

/**
 * idealEndY 위쪽 searchWindowPx 범위 내에서 텍스트/박스를 자르지 않는 가장 깨끗한 페이지 분할 Y 좌표를 찾는다.
 */
function findCleanBreakY(
  ctx: CanvasRenderingContext2D,
  width: number,
  startY: number,
  idealEndY: number,
  minSlicePx: number
): number {
  const searchTop = Math.max(startY + minSlicePx, idealEndY - Math.floor((idealEndY - startY) * 0.24));
  const bandHeight = idealEndY - searchTop;
  if (bandHeight < 8) return idealEndY;

  const imgData = ctx.getImageData(0, searchTop, width, bandHeight).data;
  const rowStride = width * 4;

  // 1순위: 가장 넓은 순백 여백 밴드 (섹션/카드 사이)
  // 2순위: 균일 배경 밴드 (카드 내부 문단 사이)
  for (const targetTier of [2, 1] as const) {
    let bestCenter = -1;
    let runLength = 0;

    for (let y = bandHeight - 1; y >= 0; y--) {
      const tier = classifyCanvasRow(imgData, y * rowStride, width);
      if (tier >= targetTier) {
        runLength++;
        if (runLength >= 6 && bestCenter === -1) {
          // 가장 아래쪽(= 페이지 공간을 최대한 활용) 깨끗한 여백 밴드 시작 지점 기록
          let topY = y;
          while (topY > 0 && classifyCanvasRow(imgData, (topY - 1) * rowStride, width) >= targetTier) {
            topY--;
          }
          bestCenter = searchTop + Math.floor((topY + (y + runLength - 1)) / 2);
          return bestCenter;
        }
      } else {
        runLength = 0;
      }
    }
  }

  return idealEndY;
}

/**
 * 일반 결과 DOM(FreePreview, MbtiSajuModal, CompatibilityModal 등)을
 * A4 인쇄 규격(여백 · 고정 데스크톱 폭 · 문단 비절단 스마트 페이지네이션 · 머리글/쪽번호) PDF로 생성합니다.
 */
export const generatePDF = async (
  element: HTMLElement,
  filename: string,
  options?: PdfReportOptions
) => {
  try {
    await waitForPdfAssets(element);

    const a4ContentCssWidth = 794;
    const todayStr = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // 매우 긴 리포트에서도 브라우저 최대 캔버스 픽셀/높이를 초과하지 않도록 스케일 동적 조절
    const estimatedHeight = Math.max(element.scrollHeight, 1000);
    const rawScale = 2;
    const maxCanvasPixels = 20_000_000;
    const maxCanvasHeight = 15_000;
    const safeScale = Math.max(
      1.15,
      Math.min(
        rawScale,
        maxCanvasHeight / (estimatedHeight + 240),
        Math.sqrt(maxCanvasPixels / (a4ContentCssWidth * (estimatedHeight + 240)))
      )
    );

    const canvas = await html2canvas(element, {
      scale: safeScale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: a4ContentCssWidth,
      windowWidth: 1024,
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 15000,
      ignoreElements: (el) => el.getAttribute('data-pdf-ignore') === 'true',
      onclone: (clonedDoc, clonedEl) => {
        clonedDoc.documentElement.scrollTop = 0;
        clonedDoc.body.scrollTop = 0;

        // 고정 A4 문서 폭으로 정리해 모바일 뷰포트에서도 찌그러지지 않게 함
        const container = clonedDoc.createElement('div');
        container.setAttribute('data-pdf-root', 'true');
        container.style.width = `${a4ContentCssWidth}px`;
        container.style.padding = '16px 24px 28px 24px';
        container.style.backgroundColor = '#FFFFFF';
        container.style.boxSizing = 'border-box';
        container.style.fontFamily = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

        const masthead = clonedDoc.createElement('div');
        masthead.style.display = 'flex';
        masthead.style.justifyContent = 'space-between';
        masthead.style.alignItems = 'flex-end';
        masthead.style.paddingBottom = '14px';
        masthead.style.marginBottom = '20px';
        masthead.style.borderBottom = '2px solid #0F172A';
        masthead.innerHTML = `
          <div>
            <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#475569;margin-bottom:4px;">MBTIJU REPORT</div>
            <div style="font-size:21px;font-weight:900;color:#0F172A;line-height:1.25;">${escapeHtml(options?.reportTitle || '사주 × MBTI 통합 분석 리포트')}</div>
          </div>
          <div style="text-align:right;">
            ${options?.reportSubtitle ? `<div style="font-size:12px;font-weight:700;color:#334155;">${escapeHtml(options.reportSubtitle)}</div>` : ''}
            <div style="font-size:11px;font-weight:600;color:#64748B;margin-top:2px;">발급일: ${todayStr}</div>
          </div>
        `;

        const parent = clonedEl.parentElement;
        if (parent) {
          parent.insertBefore(container, clonedEl);
        }

        clonedEl.style.width = '100%';
        clonedEl.style.maxWidth = 'none';
        clonedEl.style.margin = '0';
        clonedEl.style.padding = '0';
        clonedEl.style.boxShadow = 'none';
        clonedEl.style.borderRadius = '0';

        container.appendChild(masthead);
        container.appendChild(clonedEl);

        const style = clonedDoc.createElement('style');
        style.textContent = `
          [data-pdf-root="true"], [data-pdf-root="true"] * {
            animation: none !important;
            transition: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            box-shadow: none !important;
          }
          [data-pdf-root="true"] [data-pdf-ignore="true"] {
            display: none !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      },
    });

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidthMm = doc.internal.pageSize.getWidth(); // 210
    const pageHeightMm = doc.internal.pageSize.getHeight(); // 297
    const marginX = 10;
    const marginTop = 14;
    const marginBottom = 16;
    const contentWidthMm = pageWidthMm - marginX * 2; // 190
    const contentHeightMm = pageHeightMm - marginTop - marginBottom; // 267

    const pxPerMm = canvas.width / contentWidthMm;
    const maxSliceHeightPx = Math.floor(contentHeightMm * pxPerMm);
    const minSliceHeightPx = Math.floor(140 * pxPerMm);

    // 페이지 분할 구간 먼저 계산 (총 페이지 수 N 표기용)
    const slices: Array<{ y: number; height: number }> = [];
    let cursorY = 0;
    while (cursorY < canvas.height) {
      const idealEndY = Math.min(canvas.height, cursorY + maxSliceHeightPx);
      const cutY =
        idealEndY >= canvas.height || !ctx
          ? idealEndY
          : findCleanBreakY(ctx, canvas.width, cursorY, idealEndY, minSliceHeightPx);
      const sliceHeight = Math.max(1, cutY - cursorY);
      slices.push({ y: cursorY, height: sliceHeight });
      cursorY = cutY;
    }

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    const sliceCtx = sliceCanvas.getContext('2d');

    const totalPages = slices.length;
    for (let i = 0; i < totalPages; i++) {
      const slice = slices[i]!;
      if (i > 0) doc.addPage();

      sliceCanvas.height = slice.height;
      if (sliceCtx) {
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceCtx.drawImage(
          canvas,
          0,
          slice.y,
          canvas.width,
          slice.height,
          0,
          0,
          canvas.width,
          slice.height
        );
      }

      const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.94);
      const sliceHeightMm = slice.height / pxPerMm;
      doc.addImage(sliceImgData, 'JPEG', marginX, marginTop, contentWidthMm, sliceHeightMm);

      // 머리글 & 바닥글 (ASCII 전용 벡터 텍스트: 한글 폰트 임베딩 없이 선명하게 출력)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('MBTIJU  |  PERSONAL REPORT', marginX, 9.5);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(marginX, pageHeightMm - 11, pageWidthMm - marginX, pageHeightMm - 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('www.mbtiju.com', marginX, pageHeightMm - 6.5);
      doc.text(`${i + 1} / ${totalPages}`, pageWidthMm - marginX, pageHeightMm - 6.5, { align: 'right' });
    }

    // 메모리 정리
    sliceCanvas.width = 0;
    sliceCanvas.height = 0;
    canvas.width = 0;
    canvas.height = 0;

    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};
