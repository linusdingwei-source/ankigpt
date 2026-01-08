package com.ankigpt.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ankigpt.data.model.CardData
import com.ankigpt.data.model.CardsResponse
import com.ankigpt.data.repository.CardRepository
import com.ankigpt.util.Result
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * 卡片 ViewModel
 */
class CardViewModel(
    private val cardRepository: CardRepository = CardRepository(),
    private val tokenManager: TokenManager
) : ViewModel() {
    
    // 初始状态为 null，表示还没有进行任何操作
    private val _generateState = MutableStateFlow<Result<CardData>?>(null)
    val generateState: StateFlow<Result<CardData>?> = _generateState.asStateFlow()
    
    // 初始状态为 null，表示还没有进行任何操作
    private val _cardsState = MutableStateFlow<Result<CardsResponse>?>(null)
    val cardsState: StateFlow<Result<CardsResponse>?> = _cardsState.asStateFlow()
    
    private val _currentPage = MutableStateFlow(1)
    val currentPage: StateFlow<Int> = _currentPage.asStateFlow()
    
    /**
     * 生成卡片
     */
    fun generateCard(
        text: String,
        cardType: String = "问答题（附翻转卡片）",
        deckName: String = "default",
        includePronunciation: Boolean = true
    ) {
        viewModelScope.launch {
            _generateState.value = Result.Loading
            val token = tokenManager.getTokenSync()
            if (token == null) {
                _generateState.value = Result.Error("请先登录")
                return@launch
            }
            
            when (val result = cardRepository.generateCard(
                token, text, cardType, deckName, includePronunciation
            )) {
                is Result.Success -> {
                    _generateState.value = result
                    // 生成成功后刷新列表
                    loadCards()
                }
                is Result.Error -> {
                    _generateState.value = result
                }
                else -> {}
            }
        }
    }
    
    /**
     * 加载卡片列表
     */
    fun loadCards(page: Int = 1, search: String? = null, deck: String? = null) {
        viewModelScope.launch {
            _cardsState.value = Result.Loading
            val token = tokenManager.getTokenSync()
            if (token == null) {
                _cardsState.value = Result.Error("请先登录")
                return@launch
            }
            
            when (val result = cardRepository.getCards(token, page, 20, search, deck)) {
                is Result.Success -> {
                    _cardsState.value = result
                    _currentPage.value = page
                }
                is Result.Error -> {
                    _cardsState.value = result
                }
                else -> {}
            }
        }
    }
    
    /**
     * 刷新卡片列表
     */
    fun refreshCards() {
        loadCards(_currentPage.value)
    }
    
    /**
     * 加载下一页
     */
    fun loadNextPage() {
        loadCards(_currentPage.value + 1)
    }
}

