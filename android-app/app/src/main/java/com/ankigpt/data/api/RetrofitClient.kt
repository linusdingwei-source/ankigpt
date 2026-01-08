package com.ankigpt.data.api

import android.content.Context
import com.ankigpt.util.AnonymousIdManager
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/**
 * Retrofit 客户端配置
 */
object RetrofitClient {
    // Vercel 生产环境地址
    // 主域名：https://www.nihogogpt.com
    // 备用域名：https://ankigpt-kappa.vercel.app
    private const val BASE_URL = "https://www.nihogogpt.com"
    
    private var context: Context? = null
    
    /**
     * 初始化 Retrofit 客户端（需要 Context 来获取匿名 ID）
     */
    fun initialize(appContext: Context) {
        context = appContext.applicationContext
    }
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    // 创建认证拦截器，自动添加 Token 或匿名 ID
    private val authInterceptor = Interceptor { chain ->
        val originalRequest = chain.request()
        val newRequestBuilder = originalRequest.newBuilder()
        
        // 检查请求是否已经有 Authorization header（避免重复添加）
        val hasAuthHeader = originalRequest.header("Authorization") != null
        
        if (!hasAuthHeader) {
            // 尝试添加 Bearer Token
            val token = context?.let { ctx ->
                val tokenManager = TokenManager(ctx)
                kotlinx.coroutines.runBlocking {
                    tokenManager.getTokenSync()
                }
            }
            
            if (token != null) {
                // 如果已登录，添加 Bearer Token
                newRequestBuilder.header("Authorization", "Bearer $token")
            } else {
                // 如果未登录，添加匿名 ID
                val anonymousId = context?.let { ctx ->
                    val anonymousIdManager = AnonymousIdManager(ctx)
                    kotlinx.coroutines.runBlocking {
                        anonymousIdManager.getOrCreateAnonymousId()
                    }
                }
                
                if (anonymousId != null) {
                    newRequestBuilder.header("X-Anonymous-Id", anonymousId)
                }
            }
        }
        
        chain.proceed(newRequestBuilder.build())
    }
    
    // 创建信任所有证书的 TrustManager（仅用于开发环境）
    private val trustAllCerts = arrayOf<TrustManager>(
        object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        }
    )
    
    // 创建 SSLContext
    private val sslContext = SSLContext.getInstance("SSL").apply {
        init(null, trustAllCerts, java.security.SecureRandom())
    }
    
    private var okHttpClient: OkHttpClient? = null
    
    private fun getOkHttpClient(): OkHttpClient {
        if (okHttpClient == null) {
            okHttpClient = OkHttpClient.Builder()
                .addInterceptor(authInterceptor) // 先添加认证拦截器
                .addInterceptor(loggingInterceptor)
                .sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as X509TrustManager)
                .hostnameVerifier { _, _ -> true } // 信任所有主机名（仅用于开发）
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build()
        }
        return okHttpClient!!
    }
    
    private var retrofit: Retrofit? = null
    
    private fun getRetrofit(): Retrofit {
        if (retrofit == null) {
            retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(getOkHttpClient())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!
    }
    
    val apiService: ApiService
        get() = getRetrofit().create(ApiService::class.java)
    
    /**
     * 更新 Base URL（用于切换环境）
     */
    fun updateBaseUrl(baseUrl: String) {
        // 注意：Retrofit 实例创建后无法修改 baseUrl
        // 如果需要动态切换，需要重新创建 Retrofit 实例
    }
}

