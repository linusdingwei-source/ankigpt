'use client';

import { useEffect, useState } from 'react';
import { getOrCreateAnonymousId, setAnonymousIdCookie } from '@/lib/client/anonymous-user';

/**
 * Hook 用于管理临时用户 ID
 * 在组件挂载时自动获取或创建临时用户 ID
 */
export function useAnonymousUser() {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取或创建临时用户 ID
    const id = getOrCreateAnonymousId();
    setAnonymousId(id);
    
    // 同时设置 cookie（作为备用）
    setAnonymousIdCookie(id);
    
    setLoading(false);
  }, []);

  return { anonymousId, loading };
}

/**
 * 获取请求头，包含临时用户 ID
 */
export function getAnonymousHeaders(): HeadersInit {
  const anonymousId = typeof window !== 'undefined' 
    ? getOrCreateAnonymousId() 
    : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (anonymousId) {
    headers['x-anonymous-id'] = anonymousId;
  }

  return headers;
}

