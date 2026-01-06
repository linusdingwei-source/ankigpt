package com.ankigpt.data.model

/**
 * 认证相关数据模型
 */
data class LoginRequest(
    val email: String,
    val password: String? = null,
    val code: String? = null
)

data class RegisterRequest(
    val email: String,
    val password: String,
    val code: String
)

data class LoginData(
    val token: String,
    val user: UserInfo
)

data class UserInfo(
    val id: String,
    val email: String,
    val credits: Int
)

data class SessionData(
    val user: UserInfo
)

