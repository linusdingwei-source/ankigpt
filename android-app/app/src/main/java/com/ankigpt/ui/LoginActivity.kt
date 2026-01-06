package com.ankigpt.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ankigpt.R
import com.ankigpt.databinding.ActivityLoginBinding
import com.ankigpt.ui.viewmodel.AuthViewModel
import com.ankigpt.util.Result
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.launch

/**
 * 登录 Activity
 */
class LoginActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityLoginBinding
    private lateinit var tokenManager: TokenManager
    private val viewModel: AuthViewModel by viewModels {
        AuthViewModelFactory(tokenManager)
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        tokenManager = TokenManager(this)
        
        // 检查是否已登录
        lifecycleScope.launch {
            if (tokenManager.isLoggedIn()) {
                navigateToMain()
                return@launch
            }
        }
        
        setupObservers()
        setupClickListeners()
    }
    
    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.loginState.collect { result ->
                when (result) {
                    is Result.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.errorText.visibility = View.GONE
                        binding.loginButton.isEnabled = false
                    }
                    is Result.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.GONE
                        binding.loginButton.isEnabled = true
                        Toast.makeText(this@LoginActivity, "登录成功", Toast.LENGTH_SHORT).show()
                        navigateToMain()
                    }
                    is Result.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.VISIBLE
                        binding.errorText.text = result.message
                        binding.loginButton.isEnabled = true
                    }
                }
            }
        }
    }
    
    private fun setupClickListeners() {
        binding.loginButton.setOnClickListener {
            val email = binding.emailEditText.text.toString().trim()
            val password = binding.passwordEditText.text.toString().trim()
            
            if (email.isEmpty()) {
                binding.emailLayout.error = "请输入邮箱"
                return@setOnClickListener
            }
            
            if (password.isEmpty()) {
                binding.passwordLayout.error = "请输入密码"
                return@setOnClickListener
            }
            
            viewModel.loginWithPassword(email, password)
        }
        
        binding.registerButton.setOnClickListener {
            // TODO: 跳转到注册页面
            Toast.makeText(this, "注册功能待实现", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
    }
}

/**
 * ViewModel Factory
 */
class AuthViewModelFactory(
    private val tokenManager: TokenManager
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AuthViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return AuthViewModel(tokenManager = tokenManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

