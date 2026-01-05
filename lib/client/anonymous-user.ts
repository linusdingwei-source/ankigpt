'use client';

/**
 * 客户端临时用户 ID 管理
 * 使用 localStorage 存储临时用户 ID
 */

const ANONYMOUS_ID_KEY = 'anonymous-user-id';

/**
 * 获取或创建临时用户 ID
 * @returns 临时用户 ID
 */
export function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  // 尝试从 localStorage 获取
  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);

  // 如果不存在，生成新的 ID
  if (!anonymousId) {
    anonymousId = generateUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  }

  return anonymousId;
}

/**
 * 获取临时用户 ID（不创建）
 * @returns 临时用户 ID 或 null
 */
export function getAnonymousId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(ANONYMOUS_ID_KEY);
}

/**
 * 清除临时用户 ID（登录后使用）
 */
export function clearAnonymousId(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(ANONYMOUS_ID_KEY);
}

/**
 * 生成 UUID
 */
function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 设置 cookie（作为 localStorage 的备用）
 */
export function setAnonymousIdCookie(anonymousId: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  // 设置 cookie，30 天过期
  const expires = new Date();
  expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000);
  document.cookie = `anonymous-id=${anonymousId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

