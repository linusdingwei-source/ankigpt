package com.ankigpt.data.repository

import com.ankigpt.data.api.ApiService
import com.ankigpt.data.api.RetrofitClient
import com.ankigpt.data.model.TTSData
import com.ankigpt.data.model.TTSRequest
import com.ankigpt.util.Result

/**
 * TTS Repository
 */
class TTSRepository(
    private val apiService: ApiService = RetrofitClient.apiService
) {
    
    /**
     * 生成 TTS 音频
     */
    suspend fun generateTTS(token: String, text: String): Result<TTSData> {
        return try {
            val response = apiService.generateTTS("Bearer $token", TTSRequest(text))
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
}

