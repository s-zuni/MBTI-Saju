/**
 * Utility to detect if the user is browsing from within an in-app browser
 * (like KakaoTalk, Instagram, Line, etc.) which often have restrictions on 
 * third-party cookies and OAuth redirects.
 */
export const isInAppBrowser = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const ua = window.navigator.userAgent.toLowerCase();
    
    // List of common in-app browser signatures
    const inAppSignatures = [
        'kakaotalk',
        'instagram',
        'fban', // Facebook App for iOS
        'fbav', // Facebook App for Android
        'line',
        'naver',
        'whale',
        'snapchat'
    ];
    
    return inAppSignatures.some(sig => ua.includes(sig));
};

/**
 * Checks if the current browser is likely to have issues with Google OAuth
 */
export const isRestrictedBrowser = (): boolean => {
    return isInAppBrowser();
};
