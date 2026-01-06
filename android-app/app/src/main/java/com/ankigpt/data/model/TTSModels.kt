package com.ankigpt.data.model

/**
 * TTS 相关数据模型
 */
data class TTSRequest(
    val text: String
)

data class TTSData(
    val audio: String, // Base64 encoded audio
    val format: String,
    val credits: Int
)

