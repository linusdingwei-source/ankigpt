package com.ankigpt.data.repository

import com.ankigpt.data.api.ApiService
import com.ankigpt.data.api.RetrofitClient
import com.ankigpt.data.model.*
import com.ankigpt.util.Result

/**
 * 卡片 Repository
 */
class CardRepository(
    private val apiService: ApiService = RetrofitClient.apiService
) {
    
    /**
     * 生成卡片
     */
    suspend fun generateCard(
        token: String,
        text: String,
        cardType: String = "问答题（附翻转卡片）",
        deckName: String = "default",
        includePronunciation: Boolean = true
    ): Result<CardData> {
        return try {
            // 拦截器会自动添加 Authorization 或 X-Anonymous-Id
            val response = apiService.generateCard(
                CardGenerateRequest(text, cardType, deckName, includePronunciation)
            )
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    Result.Success(data)
                } else {
                    Result.Error("生成失败：数据为空")
                }
            } else {
                val error = response.body()?.error
                when (error?.code) {
                    "INSUFFICIENT_CREDITS" -> {
                        val details = error.details
                        val credits = details?.get("credits") as? Number
                        val required = details?.get("required") as? Number
                        val message = if (credits != null && required != null) {
                            "Credits 不足（当前：$credits，需要：$required）"
                        } else {
                            error.message ?: "Credits 不足"
                        }
                        Result.Error(message)
                    }
                    else -> Result.Error(error?.message ?: "生成失败")
                }
            }
        } catch (e: Exception) {
            Result.Error("网络错误：${e.message}")
        }
    }
    
    /**
     * 获取卡片列表
     */
    suspend fun getCards(
        token: String,
        page: Int = 1,
        limit: Int = 20,
        search: String? = null,
        deck: String? = null
    ): Result<CardsResponse> {
        return try {
            // 拦截器会自动添加 Authorization 或 X-Anonymous-Id
            val response = apiService.getCards(page, limit, search, deck)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    Result.Success(data)
                } else {
                    Result.Error("获取失败：数据为空")
                }
            } else {
                val error = response.body()?.error
                Result.Error(error?.message ?: "获取失败")
            }
        } catch (e: Exception) {
            Result.Error("网络错误：${e.message}")
        }
    }
    
    /**
     * 获取单个卡片
     */
    suspend fun getCard(token: String, id: String): Result<CardData> {
        return try {
            // 拦截器会自动添加 Authorization 或 X-Anonymous-Id
            val response = apiService.getCard(id)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    Result.Success(data)
                } else {
                    Result.Error("获取失败：数据为空")
                }
            } else {
                val error = response.body()?.error
                Result.Error(error?.message ?: "获取失败")
            }
        } catch (e: Exception) {
            Result.Error("网络错误：${e.message}")
        }
    }
}

