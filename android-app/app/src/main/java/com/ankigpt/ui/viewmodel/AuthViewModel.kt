package com.ankigpt.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ankigpt.data.model.LoginData
import com.ankigpt.data.repository.AuthRepository
import com.ankigpt.util.Result
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * 认证 ViewModel
 */
class AuthViewModel(
    private val authRepository: AuthRepository = AuthRepository(),
    private val tokenManager: TokenManager
) : ViewModel() {
    
    private val _loginState = MutableStateFlow<Result<LoginData>?>(null)
    val loginState: StateFlow<Result<LoginData>?> = _loginState.asStateFlow()
    
    private val _registerState = MutableStateFlow<Result<LoginData>>(Result.Loading)
    val registerState: StateFlow<Result<LoginData>> = _registerState.asStateFlow()
    
    /**
     * 使用密码登录
     */
    fun loginWithPassword(email: String, password: String) {
        viewModelScope.launch {
            _loginState.value = Result.Loading
            when (val result = authRepository.loginWithPassword(email, password)) {
                is Result.Success -> {
                    // 保存 Token
                    tokenManager.saveToken(
                        result.data.token,
                        result.data.user.id,
                        result.data.user.email
                    )
                    _loginState.value = result
                }
                is Result.Error -> {
                    _loginState.value = result
                }
                else -> {}
            }
        }
    }
    
    /**
     * 使用验证码登录
     */
    fun loginWithCode(email: String, code: String) {
        viewModelScope.launch {
            _loginState.value = Result.Loading
            when (val result = authRepository.loginWithCode(email, code)) {
                is Result.Success -> {
                    // 保存 Token
                    tokenManager.saveToken(
                        result.data.token,
                        result.data.user.id,
                        result.data.user.email
                    )
                    _loginState.value = result
                }
                is Result.Error -> {
                    _loginState.value = result
                }
                else -> {}
            }
        }
    }
    
    /**
     * 注册
     */
    fun register(email: String, password: String, code: String) {
        viewModelScope.launch {
            _registerState.value = Result.Loading
            when (val result = authRepository.register(email, password, code)) {
                is Result.Success -> {
                    // 保存 Token
                    tokenManager.saveToken(
                        result.data.token,
                        result.data.user.id,
                        result.data.user.email
                    )
                    _registerState.value = result
                }
                is Result.Error -> {
                    _registerState.value = result
                }
                else -> {}
            }
        }
    }
    
    /**
     * 检查登录状态
     */
    fun checkLoginStatus() {
        viewModelScope.launch {
            val isLoggedIn = tokenManager.isLoggedIn()
            if (!isLoggedIn) {
                _loginState.value = Result.Error("未登录")
            }
        }
    }
    
    /**
     * 登出
     */
    fun logout() {
        viewModelScope.launch {
            tokenManager.clearToken()
            _loginState.value = Result.Loading
        }
    }
}

