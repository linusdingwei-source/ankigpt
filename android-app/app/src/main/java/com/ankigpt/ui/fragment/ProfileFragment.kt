package com.ankigpt.ui.fragment

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.ankigpt.databinding.FragmentProfileBinding
import com.ankigpt.ui.LoginActivity
import com.ankigpt.ui.viewmodel.ProfileViewModel
import com.ankigpt.util.Result
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.launch

/**
 * 用户信息 Fragment
 */
class ProfileFragment : Fragment() {
    
    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var tokenManager: TokenManager
    private val viewModel: ProfileViewModel by viewModels {
        ProfileViewModelFactory(tokenManager)
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        tokenManager = TokenManager(requireContext())
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupObservers()
        setupClickListeners()
        
        // 如果已登录，加载用户信息
        viewLifecycleOwner.lifecycleScope.launch {
            if (tokenManager.isLoggedIn()) {
                viewModel.loadUserInfo()
            }
        }
    }
    
    private fun setupObservers() {
        // 使用 viewLifecycleOwner.lifecycleScope 确保当 view 被销毁时协程自动取消
        viewLifecycleOwner.lifecycleScope.launch {
            // 检查登录状态
            val isLoggedIn = tokenManager.isLoggedIn()
            
            if (!isLoggedIn) {
                // 未登录状态：显示登录提示
                val binding = _binding ?: return@launch
                binding.progressBar.visibility = View.GONE
                binding.errorText.visibility = View.GONE
                binding.emailText.text = "未登录"
                binding.creditsText.text = "-"
                binding.userIdText.visibility = View.GONE
                binding.logoutButton.text = "登录"
                return@launch
            }
            
            // 已登录：加载用户信息
            viewModel.userState.collect { result ->
                // 检查 binding 是否仍然有效
                val binding = _binding ?: return@collect
                
                when (result) {
                    null -> {
                        // 初始状态：隐藏 loading，显示默认信息
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.GONE
                    }
                    is Result.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.errorText.visibility = View.GONE
                    }
                    is Result.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.GONE
                        
                        // 显示用户信息
                        val user = result.data
                        binding.emailText.text = user.email
                        binding.creditsText.text = user.credits.toString()
                        binding.userIdText.text = "用户ID: ${user.id}"
                        binding.userIdText.visibility = View.VISIBLE
                    }
                    is Result.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.VISIBLE
                        binding.errorText.text = result.message
                    }
                }
            }
        }
    }
    
    private fun setupClickListeners() {
        binding.refreshButton.setOnClickListener {
            viewModel.loadUserInfo()
        }
        
        binding.logoutButton.setOnClickListener {
            viewLifecycleOwner.lifecycleScope.launch {
                val isLoggedIn = tokenManager.isLoggedIn()
                
                if (isLoggedIn) {
                    // 已登录：退出登录
                    tokenManager.clearToken()
                    
                    // 跳转到登录页面
                    val intent = Intent(requireContext(), LoginActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    requireActivity().finish()
                } else {
                    // 未登录：跳转到登录页面
                    val intent = Intent(requireContext(), LoginActivity::class.java)
                    startActivity(intent)
                }
            }
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

/**
 * Profile ViewModel Factory
 */
class ProfileViewModelFactory(
    private val tokenManager: TokenManager
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ProfileViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ProfileViewModel(tokenManager = tokenManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

