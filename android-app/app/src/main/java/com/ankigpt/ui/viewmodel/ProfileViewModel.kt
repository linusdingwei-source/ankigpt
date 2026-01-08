package com.ankigpt.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ankigpt.data.model.UserInfo
import com.ankigpt.data.repository.UserRepository
import com.ankigpt.util.Result
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * 用户信息 ViewModel
 */
class ProfileViewModel(
    private val userRepository: UserRepository = UserRepository(),
    private val tokenManager: TokenManager
) : ViewModel() {
    
    // 初始状态为 null，表示还没有进行任何操作
    private val _userState = MutableStateFlow<Result<UserInfo>?>(null)
    val userState: StateFlow<Result<UserInfo>?> = _userState.asStateFlow()
    
    /**
     * 加载用户信息
     */
    fun loadUserInfo() {
        viewModelScope.launch {
            _userState.value = Result.Loading
            val token = tokenManager.getTokenSync()
            if (token == null) {
                _userState.value = Result.Error("请先登录")
                return@launch
            }
            
            when (val result = userRepository.getUserInfo(token)) {
                is Result.Success -> {
                    _userState.value = result
                }
                is Result.Error -> {
                    _userState.value = result
                }
                else -> {}
            }
        }
    }
}

