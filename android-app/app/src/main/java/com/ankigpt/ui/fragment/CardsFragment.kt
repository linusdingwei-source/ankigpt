package com.ankigpt.ui.fragment

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.ankigpt.databinding.FragmentCardsBinding
import com.ankigpt.ui.adapter.CardsAdapter
import com.ankigpt.ui.viewmodel.CardViewModel
import com.ankigpt.util.Result
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay

/**
 * 卡片列表 Fragment
 */
class CardsFragment : Fragment() {
    
    private var _binding: FragmentCardsBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var tokenManager: TokenManager
    private val viewModel: CardViewModel by viewModels {
        CardViewModelFactory(tokenManager)
    }
    
    private lateinit var adapter: CardsAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCardsBinding.inflate(inflater, container, false)
        tokenManager = TokenManager(requireContext())
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupRecyclerView()
        setupObservers()
        setupSearch()
        
        // 加载卡片列表
        viewModel.loadCards()
    }
    
    private fun setupRecyclerView() {
        adapter = CardsAdapter()
        binding.cardsRecyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.cardsRecyclerView.adapter = adapter
    }
    
    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.cardsState.collect { result ->
                when (result) {
                    is Result.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.errorText.visibility = View.GONE
                        binding.emptyText.visibility = View.GONE
                    }
                    is Result.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.GONE
                        
                        if (result.data.cards.isEmpty()) {
                            binding.emptyText.visibility = View.VISIBLE
                        } else {
                            binding.emptyText.visibility = View.GONE
                            adapter.submitList(result.data.cards)
                        }
                    }
                    is Result.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.errorText.visibility = View.VISIBLE
                        binding.errorText.text = result.message
                        binding.emptyText.visibility = View.GONE
                    }
                }
            }
        }
    }
    
    private fun setupSearch() {
        binding.searchEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            
            override fun afterTextChanged(s: Editable?) {
                // 防抖搜索
                lifecycleScope.launch {
                    delay(500)
                    val query = s?.toString()?.trim() ?: ""
                    viewModel.loadCards(page = 1, search = if (query.isEmpty()) null else query)
                }
            }
        })
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

