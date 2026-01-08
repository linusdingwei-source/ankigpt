package com.ankigpt.data.repository

import com.ankigpt.data.api.ApiService
import com.ankigpt.data.api.RetrofitClient
import com.ankigpt.data.model.*
import com.ankigpt.util.Result

/**
 * 用户 Repository
 */
class UserRepository(
    private val apiService: ApiService = RetrofitClient.apiService
) {
    
    /**
     * 获取用户信息
     */
    suspend fun getUserInfo(token: String): Result<UserInfo> {
        return try {
            val response = apiService.getSession("Bearer $token")
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null && data.user != null) {
                    Result.Success(data.user)
                } else {
                    Result.Error("获取失败：数据为空")
                }
            } else {
                val error = response.body()?.error
                Result.Error(error?.message ?: "获取用户信息失败")
            }
        } catch (e: Exception) {
            Result.Error("网络错误：${e.message}")
        }
    }
    
    /**
     * 获取用户 Credits
     */
    suspend fun getCredits(token: String): Result<Int> {
        return try {
            val response = apiService.getCredits("Bearer $token")
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    Result.Success(data.credits)
                } else {
                    Result.Error("获取失败：数据为空")
                }
            } else {
                val error = response.body()?.error
                Result.Error(error?.message ?: "获取 Credits 失败")
            }
        } catch (e: Exception) {
            Result.Error("网络错误：${e.message}")
        }
    }
}

