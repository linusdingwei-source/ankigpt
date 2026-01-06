package com.ankigpt.ui.fragment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.ankigpt.databinding.FragmentGenerateCardBinding
import com.ankigpt.ui.viewmodel.CardViewModel
import com.ankigpt.util.Result
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.launch

/**
 * 卡片生成 Fragment
 */
class GenerateCardFragment : Fragment() {
    
    private var _binding: FragmentGenerateCardBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var tokenManager: TokenManager
    private val viewModel: CardViewModel by viewModels {
        CardViewModelFactory(tokenManager)
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentGenerateCardBinding.inflate(inflater, container, false)
        tokenManager = TokenManager(requireContext())
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupObservers()
        setupClickListeners()
    }
    
    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.generateState.collect { result ->
                when (result) {
                    is Result.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.errorText.visibility = View.GONE
                        binding.previewCard.visibility = View.GONE
                        binding.generateButton.isEnabled = false
                    }
                    is Result.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.GONE
                        binding.generateButton.isEnabled = true
                        
                        // 显示预览
                        binding.previewCard.visibility = View.VISIBLE
                        binding.frontContentText.text = result.data.frontContent
                        binding.backContentText.text = result.data.backContent
                        
                        Toast.makeText(requireContext(), "卡片生成成功", Toast.LENGTH_SHORT).show()
                    }
                    is Result.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.VISIBLE
                        binding.errorText.text = result.message
                        binding.generateButton.isEnabled = true
                        binding.previewCard.visibility = View.GONE
                    }
                }
            }
        }
    }
    
    private fun setupClickListeners() {
        binding.generateButton.setOnClickListener {
            val text = binding.textEditText.text.toString().trim()
            if (text.isEmpty()) {
                binding.textLayout.error = "请输入日文句子"
                return@setOnClickListener
            }
            
            val includePronunciation = binding.includePronunciationCheckBox.isChecked
            viewModel.generateCard(
                text = text,
                includePronunciation = includePronunciation
            )
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

/**
 * Card ViewModel Factory
 */
class CardViewModelFactory(
    private val tokenManager: TokenManager
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(CardViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return CardViewModel(tokenManager = tokenManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

