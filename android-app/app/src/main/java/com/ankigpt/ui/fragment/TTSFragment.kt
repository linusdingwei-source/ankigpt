package com.ankigpt.ui.fragment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.ankigpt.R
import com.ankigpt.databinding.FragmentTtsBinding
import com.ankigpt.ui.viewmodel.TTSViewModel
import com.ankigpt.util.Result
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.launch

/**
 * TTS Fragment
 */
class TTSFragment : Fragment() {
    
    private var _binding: FragmentTtsBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var tokenManager: TokenManager
    private val viewModel: TTSViewModel by viewModels {
        TTSViewModelFactory(tokenManager)
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTtsBinding.inflate(inflater, container, false)
        tokenManager = TokenManager(requireContext())
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupObservers()
        setupClickListeners()
    }
    
    private fun setupObservers() {
        // 使用 viewLifecycleOwner.lifecycleScope 确保当 view 被销毁时协程自动取消
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.ttsState.collect { result ->
                // 检查 binding 是否仍然有效
                val binding = _binding ?: return@collect
                
                when (result) {
                    null -> {
                        // 初始状态：隐藏 loading，启用按钮
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.GONE
                        binding.generateButton.isEnabled = true
                        binding.playButton.isEnabled = false
                    }
                    is Result.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.errorText.visibility = View.GONE
                        binding.generateButton.isEnabled = false
                        binding.playButton.isEnabled = false
                    }
                    is Result.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.GONE
                        binding.generateButton.isEnabled = true
                        binding.playButton.isEnabled = true
                        
                        // 自动播放
                        result.data.audio?.let { audio ->
                            viewModel.playAudio(audio)
                        }
                    }
                    is Result.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.VISIBLE
                        binding.errorText.text = result.message
                        binding.generateButton.isEnabled = true
                        binding.playButton.isEnabled = false
                    }
                }
            }
        }
        
        lifecycleScope.launch {
            viewModel.isPlaying.collect { isPlaying ->
                binding.playButton.text = if (isPlaying) {
                    getString(R.string.tts_playing)
                } else {
                    "播放"
                }
            }
        }
    }
    
    private fun setupClickListeners() {
        binding.generateButton.setOnClickListener {
            val text = binding.textEditText.text.toString().trim()
            if (text.isEmpty()) {
                binding.textLayout.error = "请输入文本"
                return@setOnClickListener
            }
            viewModel.generateTTS(text)
        }
        
        binding.playButton.setOnClickListener {
            // 重新播放当前音频
            viewLifecycleOwner.lifecycleScope.launch {
                val result = viewModel.ttsState.value
                if (result is Result.Success) {
                    result.data.audio?.let { audio ->
                        viewModel.playAudio(audio)
                    }
                }
            }
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        viewModel.stopAudio()
        _binding = null
    }
}

/**
 * TTS ViewModel Factory
 */
class TTSViewModelFactory(
    private val tokenManager: TokenManager
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(TTSViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return TTSViewModel(tokenManager = tokenManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

