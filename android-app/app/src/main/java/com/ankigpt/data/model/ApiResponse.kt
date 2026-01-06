package com.ankigpt.data.model

/**
 * 统一 API 响应格式
 */
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ErrorResponse? = null
)

data class ErrorResponse(
    val code: String,
    val message: String,
    val details: Map<String, Any>? = null
)

