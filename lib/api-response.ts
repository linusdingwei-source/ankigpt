/**
 * 统一 API 响应格式
 */

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 创建成功响应
 */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * 创建错误响应
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * 常见错误码
 */
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const;

