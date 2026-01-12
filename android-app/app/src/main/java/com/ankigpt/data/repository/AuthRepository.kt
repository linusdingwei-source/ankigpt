package com.ankigpt.data.repository

import com.ankigpt.data.api.ApiService
import com.ankigpt.data.api.RetrofitClient
import com.ankigpt.data.model.*
import com.ankigpt.util.Result

/**
 * 认证 Repository
 */
class AuthRepository(
    private val apiService: ApiService = RetrofitClient.apiService
) {
    
    /**
     * 登录（密码）
     */
    suspend fun loginWithPassword(email: String, password: String): Result<LoginData> {
        return try {
            val response = apiService.login(LoginRequest(email, password = password))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    Result.Success(data)
                } else {
                    Result.Error("登录失败：数据为空")
                }
            } else {
                val error = response.body()?.error
                Result.Error(error?.message ?: "登录失败")
            }
        } catch (e: Exception) {
            Result.Error("网络错误：${e.message}")
        }
    }
    
    /**
     * 登录（验证码）
     */
    suspend fun loginWithCode(email: String, code: String): Result<LoginData> {
        return try {
            val response = apiService.login(LoginRequest(email, code = code))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    Result.Success(data)
                } else {
                    Result.Error("登录失败：数据为空")
                }
            } else {
                val error = response.body()?.error
                Result.Error(error?.message ?: "登录失败")
            }
        } catch (e: Exception) {
            Result.Error("网络错误：${e.message}")
        }
    }
    
    /**
     * 注册
     */
    suspend fun register(email: String, password: String, code: String): Result<LoginData> {
        return try {
            val response = apiService.register(RegisterRequest(email, password, code))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    Result.Success(data)
                } else {
                    Result.Error("注册失败：数据为空")
                }
            } else {
                val error = response.body()?.error
                Result.Error(error?.message ?: "注册失败")
            }
        } catch (e: Exception) {
            Result.Error("网络错误：${e.message}")
        }
    }
    
    /**
     * 获取 Session
     */
    suspend fun getSession(token: String): Result<SessionData> {
        return try {
            // 拦截器会自动添加 Authorization 或 X-Anonymous-Id
            val response = apiService.getSession()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    Result.Success(data)
                } else {
                    Result.Error("获取 Session 失败：数据为空")
                }
            } else {
                val error = response.body()?.error
                Result.Error(error?.message ?: "获取 Session 失败")
            }
        } catch (e: Exception) {
            Result.Error("网络错误：${e.message}")
        }
    }
}

