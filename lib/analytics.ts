// Google Analytics 事件追踪工具

declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'set',
      targetId: string | object,
      config?: object
    ) => void;
  }
}

// 页面访问追踪
export function trackPageView(path: string, title?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
      page_path: path,
      page_title: title,
    });
  }
}

// 事件追踪
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

// 转化漏斗事件定义

// 1. 页面访问
export const FunnelEvents = {
  // 首页访问
  HOME_VIEW: 'home_view',
  // 登录页访问
  LOGIN_VIEW: 'login_view',
  // 注册页访问
  REGISTER_VIEW: 'register_view',
  // 定价页访问
  PRICING_VIEW: 'pricing_view',
  // 仪表板访问
  DASHBOARD_VIEW: 'dashboard_view',
  
  // 按钮点击
  LOGIN_BUTTON_CLICK: 'login_button_click',
  REGISTER_BUTTON_CLICK: 'register_button_click',
  GOOGLE_LOGIN_CLICK: 'google_login_click',
  EMAIL_LOGIN_CLICK: 'email_login_click',
  CODE_LOGIN_CLICK: 'code_login_click',
  SEND_CODE_CLICK: 'send_code_click',
  PRICING_BUTTON_CLICK: 'pricing_button_click',
  PURCHASE_BUTTON_CLICK: 'purchase_button_click',
  GENERATE_AUDIO_CLICK: 'generate_audio_click',
  
  // 转化事件
  REGISTRATION_SUCCESS: 'registration_success',
  LOGIN_SUCCESS: 'login_success',
  CHECKOUT_STARTED: 'checkout_started',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  
  // 音频生成事件
  AUDIO_GENERATION_START: 'audio_generation_start',
  AUDIO_GENERATION_SUCCESS: 'audio_generation_success',
  AUDIO_GENERATION_FAILED: 'audio_generation_failed',
  AUDIO_DOWNLOAD: 'audio_download',
  
  // 错误事件
  INSUFFICIENT_CREDITS: 'insufficient_credits',
  GENERATION_ERROR: 'generation_error',
} as const;

// 转化漏斗追踪函数

// 页面访问追踪
export function trackPageViewEvent(pageName: string, additionalData?: Record<string, unknown>) {
  trackEvent(FunnelEvents[`${pageName.toUpperCase()}_VIEW` as keyof typeof FunnelEvents] || 'page_view', 'Page View', pageName);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      trackEvent('custom_parameter', 'Page View', `${key}: ${value}`);
    });
  }
}

// 按钮点击追踪
export function trackButtonClick(buttonName: string, location?: string) {
  const eventName = FunnelEvents[`${buttonName.toUpperCase()}_BUTTON_CLICK` as keyof typeof FunnelEvents] || 
                   FunnelEvents[`${buttonName.toUpperCase()}_CLICK` as keyof typeof FunnelEvents] || 
                   'button_click';
  
  trackEvent(eventName, 'Button Click', buttonName, undefined);
  
  if (location) {
    trackEvent('button_location', 'Button Click', location);
  }
}

// 注册成功追踪
export function trackRegistrationSuccess(method: 'email' | 'google') {
  trackEvent(FunnelEvents.REGISTRATION_SUCCESS, 'Conversion', method);
  trackEvent('sign_up', 'engagement', method); // GA4 标准事件
}

// 登录成功追踪
export function trackLoginSuccess(method: 'email' | 'google' | 'code') {
  trackEvent(FunnelEvents.LOGIN_SUCCESS, 'Conversion', method);
  trackEvent('login', 'engagement', method); // GA4 标准事件
}

// 开始结账追踪
export function trackCheckoutStarted(packageId: string, price: number) {
  trackEvent(FunnelEvents.CHECKOUT_STARTED, 'Ecommerce', packageId, price);
  trackEvent('begin_checkout', 'ecommerce', packageId); // GA4 标准事件
  
  // 发送商品信息
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_item', {
      currency: 'USD',
      value: price,
      items: [{
        item_id: packageId,
        item_name: packageId,
        price: price,
        quantity: 1,
        item_category: 'Credits Package',
      }],
    });
  }
}

// 支付成功追踪
export function trackPaymentSuccess(packageId: string, price: number, credits: number, transactionId: string) {
  trackEvent(FunnelEvents.PAYMENT_SUCCESS, 'Ecommerce', packageId, price);
  trackEvent('purchase', 'ecommerce', packageId); // GA4 标准事件
  
  // 发送交易信息
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: price,
      currency: 'USD',
      items: [{
        item_id: packageId,
        item_name: packageId,
        price: price,
        quantity: 1,
        item_category: 'Credits Package',
      }],
    });
  }
}

// 支付失败追踪
export function trackPaymentFailed(packageId: string, reason?: string) {
  trackEvent(FunnelEvents.PAYMENT_FAILED, 'Ecommerce', packageId);
  if (reason) {
    trackEvent('payment_error', 'Ecommerce', reason);
  }
}

// 音频生成开始追踪
export function trackAudioGenerationStart(textLength: number) {
  trackEvent(FunnelEvents.AUDIO_GENERATION_START, 'Audio Generation', 'start', textLength);
}

// 音频生成成功追踪
export function trackAudioGenerationSuccess(textLength: number, creditsRemaining: number) {
  trackEvent(FunnelEvents.AUDIO_GENERATION_SUCCESS, 'Audio Generation', 'success', textLength);
  trackEvent('audio_conversion_success', 'Conversion', 'audio_generation', creditsRemaining);
}

// 音频生成失败追踪
export function trackAudioGenerationFailed(reason: string, creditsRemaining?: number) {
  trackEvent(FunnelEvents.AUDIO_GENERATION_FAILED, 'Audio Generation', reason);
  trackEvent('audio_conversion_failed', 'Error', reason, creditsRemaining);
}

// 音频下载追踪
export function trackAudioDownload() {
  trackEvent(FunnelEvents.AUDIO_DOWNLOAD, 'Engagement', 'download');
}

// Credits 不足追踪
export function trackInsufficientCredits(currentCredits: number) {
  trackEvent(FunnelEvents.INSUFFICIENT_CREDITS, 'Error', 'insufficient_credits', currentCredits);
  trackEvent('credits_exhausted', 'Error', 'credits', currentCredits);
}

// 转化漏斗分析辅助函数
export function calculateConversionRate(
  numerator: number,
  denominator: number
): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

