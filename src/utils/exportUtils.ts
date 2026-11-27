import html2canvas from 'html2canvas';

function escapeHtml(value: string): string {
    return (value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export interface ShareImageOptions {
    title?: string;
    text?: string;
    backgroundColor?: string;
}

export interface ReportImageOptions extends ShareImageOptions {
    reportTitle: string;
    reportSubtitle?: string;
    accentColor?: string;
}

async function waitForAssetsReady(element: HTMLElement): Promise<void> {
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

function normalizeClonedOffscreenAncestors(clonedDoc: Document, clonedEl: HTMLElement): void {
    clonedDoc.documentElement.scrollTop = 0;
    clonedDoc.body.scrollTop = 0;

    // off-screen 래퍼(fixed left-[-9999px] 등)가 뷰포트 밖/스크롤 영향으로 잘리지 않도록 복제 DOM만 원점 고정
    let parent: HTMLElement | null = clonedEl.parentElement;
    while (parent && parent !== clonedDoc.body) {
        const cls = typeof parent.className === 'string' ? parent.className : '';
        const inlineLeft = parent.style.left || '';
        if (cls.includes('-9999') || inlineLeft.startsWith('-')) {
            parent.style.position = 'fixed';
            parent.style.left = '0px';
            parent.style.top = '0px';
            parent.style.margin = '0px';
            parent.style.transform = 'none';
            parent.style.zIndex = '99999';
        }
        parent = parent.parentElement;
    }

    clonedEl.setAttribute('data-export-root', 'true');
    const style = clonedDoc.createElement('style');
    style.textContent = `
      [data-export-root="true"], [data-export-root="true"] * {
        animation: none !important;
        transition: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      [data-export-root="true"] [data-pdf-ignore="true"] {
        display: none !important;
      }
    `;
    clonedDoc.head.appendChild(style);
}

async function exportCanvasAsPng(
    canvas: HTMLCanvasElement,
    fileName: string,
    shareOptions?: ShareImageOptions
): Promise<boolean> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            async (blob) => {
                if (!blob) {
                    reject(new Error('Canvas to Blob conversion failed'));
                    return;
                }

                try {
                    const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                files: [file],
                                title: shareOptions?.title || 'MBTIJU 분석 결과',
                                text: shareOptions?.text || 'MBTIJU에서 확인한 나만의 사주·성향 분석 결과입니다.',
                            });

                            canvas.width = 0;
                            canvas.height = 0;
                            resolve(true);
                            return;
                        } catch (shareError: any) {
                            if (shareError?.name === 'AbortError') {
                                canvas.width = 0;
                                canvas.height = 0;
                                resolve(false);
                                return;
                            }
                            console.log('Share canceled or failed, falling back to download:', shareError);
                        }
                    }

                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${fileName}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);

                    canvas.width = 0;
                    canvas.height = 0;
                    resolve(true);
                } catch (e) {
                    reject(e);
                }
            },
            'image/png',
            1.0
        );
    });
}

/**
 * 특정 HTML 요소를 고화질 PNG 이미지로 캡처하여 디바이스 네이티브 공유 또는 다운로드를 수행합니다.
 */
export const generateImage = async (
    element: HTMLElement,
    fileName: string,
    scale: number = 2,
    shareOptions?: ShareImageOptions
): Promise<boolean> => {
    try {
        await waitForAssetsReady(element);

        const width = element.offsetWidth || 1080;
        const height = element.offsetHeight || 1920;
        const maxPixels = 16_000_000;
        const maxEdge = 4096;
        const safeScale = Math.max(
            1,
            Math.min(
                scale,
                maxEdge / width,
                maxEdge / height,
                Math.sqrt(maxPixels / (width * height))
            )
        );

        const canvas = await html2canvas(element, {
            scale: safeScale,
            useCORS: true,
            logging: false,
            backgroundColor: shareOptions?.backgroundColor || '#FFFFFF',
            width,
            height,
            windowWidth: Math.max(width, 1280),
            windowHeight: Math.max(height, 1080),
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            imageTimeout: 15000,
            onclone: (clonedDoc, clonedEl) => {
                normalizeClonedOffscreenAncestors(clonedDoc, clonedEl);
            },
        });

        return await exportCanvasAsPng(canvas, fileName, shareOptions);
    } catch (error) {
        console.error('Image Generation Error:', error);
        throw error;
    }
};

/**
 * 긴 결과 화면(재물/자미두수/궁합 페이지 등)을 모바일 화면 폭에 구애받지 않는
 * 고정 데스크톱 편집 폭(780px)의 브랜드 에디토리얼 PNG 카드로 깔끔하게 캡처·저장합니다.
 */
export const generateReportImage = async (
    element: HTMLElement,
    fileName: string,
    options: ReportImageOptions
): Promise<boolean> => {
    try {
        await waitForAssetsReady(element);

        const targetWidth = 780;
        const accentColor = options.accentColor || '#0F172A';
        const todayStr = new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#F9F7F2',
            windowWidth: 1024,
            scrollX: 0,
            scrollY: 0,
            imageTimeout: 15000,
            onclone: (clonedDoc, clonedEl) => {
                clonedDoc.documentElement.scrollTop = 0;
                clonedDoc.body.scrollTop = 0;

                const wrapper = clonedDoc.createElement('div');
                wrapper.setAttribute('data-export-root', 'true');
                wrapper.style.width = `${targetWidth}px`;
                wrapper.style.padding = '36px 36px 40px 36px';
                wrapper.style.backgroundColor = '#F9F7F2';
                wrapper.style.boxSizing = 'border-box';
                wrapper.style.fontFamily = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

                // 상단 브랜드 헤더
                const header = clonedDoc.createElement('div');
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.alignItems = 'flex-end';
                header.style.paddingBottom = '18px';
                header.style.marginBottom = '22px';
                header.style.borderBottom = `2px solid ${accentColor}`;
                header.innerHTML = `
                  <div>
                    <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;color:${accentColor};margin-bottom:4px;">MBTIJU ANALYSIS REPORT</div>
                    <div style="font-size:24px;font-weight:900;color:#0F172A;line-height:1.25;">${escapeHtml(options.reportTitle)}</div>
                  </div>
                  <div style="text-align:right;">
                    ${options.reportSubtitle ? `<div style="font-size:12px;font-weight:800;color:#334155;">${escapeHtml(options.reportSubtitle)}</div>` : ''}
                    <div style="font-size:11px;font-weight:600;color:#64748B;margin-top:2px;">${todayStr}</div>
                  </div>
                `;

                const parent = clonedEl.parentElement;
                if (parent) {
                    parent.insertBefore(wrapper, clonedEl);
                }

                // 원본 요소 스타일 정리 (둥근 그림자/모바일 협소 폭 보정)
                clonedEl.style.width = '100%';
                clonedEl.style.maxWidth = 'none';
                clonedEl.style.margin = '0';
                clonedEl.style.boxShadow = 'none';
                clonedEl.style.borderRadius = '24px';
                clonedEl.style.backgroundColor = '#FFFFFF';
                clonedEl.style.border = '1px solid #E2E8F0';
                clonedEl.style.padding = '32px';
                clonedEl.style.boxSizing = 'border-box';

                // 하단 워터마크 푸터
                const footer = clonedDoc.createElement('div');
                footer.style.display = 'flex';
                footer.style.justifyContent = 'space-between';
                footer.style.alignItems = 'center';
                footer.style.marginTop = '22px';
                footer.style.paddingTop = '14px';
                footer.style.borderTop = '1px solid #E2E8F0';
                footer.style.fontSize = '12px';
                footer.style.fontWeight = '700';
                footer.style.color = '#64748B';
                footer.innerHTML = `
                  <span>MBTIJU · 사주 × MBTI 정밀 운명 리포트</span>
                  <span style="color:#0F172A;font-weight:900;">www.mbtiju.com</span>
                `;

                wrapper.appendChild(header);
                wrapper.appendChild(clonedEl);
                wrapper.appendChild(footer);

                const style = clonedDoc.createElement('style');
                style.textContent = `
                  [data-export-root="true"], [data-export-root="true"] * {
                    animation: none !important;
                    transition: none !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    box-shadow: none !important;
                  }
                  [data-export-root="true"] [data-pdf-ignore="true"] {
                    display: none !important;
                  }
                `;
                clonedDoc.head.appendChild(style);
            },
        });

        return await exportCanvasAsPng(canvas, fileName, options);
    } catch (error) {
        console.error('Report Image Generation Error:', error);
        throw error;
    }
};
