package com.ankigpt.data.api

import com.ankigpt.data.model.*
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API 服务接口
 */
interface ApiService {
    
    // ========== 认证相关 ==========
    
    @POST("/api/mobile/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<LoginData>>
    
    @PUT("/api/mobile/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<LoginData>>
    
    @GET("/api/mobile/auth/session")
    suspend fun getSession(@Header("Authorization") token: String): Response<ApiResponse<SessionData>>
    
    // ========== TTS 相关 ==========
    
    @POST("/api/tts/generate")
    suspend fun generateTTS(
        @Header("Authorization") token: String,
        @Body request: TTSRequest
    ): Response<ApiResponse<TTSData>>
    
    // ========== 卡片相关 ==========
    
    @POST("/api/cards/generate")
    suspend fun generateCard(
        @Header("Authorization") token: String,
        @Body request: CardGenerateRequest
    ): Response<ApiResponse<CardData>>
    
    @GET("/api/cards")
    suspend fun getCards(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("search") search: String? = null,
        @Query("deck") deck: String? = null
    ): Response<ApiResponse<CardsResponse>>
    
    @GET("/api/cards/{id}")
    suspend fun getCard(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<ApiResponse<CardData>>
    
    // ========== 用户相关 ==========
    
    @GET("/api/user/credits")
    suspend fun getCredits(
        @Header("Authorization") token: String
    ): Response<ApiResponse<CreditsData>>
}

data class CreditsData(
    val credits: Int,
    val isAnonymous: Boolean? = null
)

