/**
 * 현재 실행 환경이 토스 앱 내부(Apps In Toss)인지 확인합니다.
 */
export const isTossApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // 1. User Agent 확인 (일반적인 방식)
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('toss')) return true;

  // 2. Apps In Toss 브릿지 존재 여부 확인
  // @ts-ignore
  if (window.toss || window.GraniteBridge || window.webkit?.messageHandlers?.GraniteBridge) {
    return true;
  }

  // 3. 도메인 기반 확인 (개발 시 필요할 수 있음)
  if (window.location.hostname.includes('appsintoss')) {
    return true;
  }

  return false;
};
