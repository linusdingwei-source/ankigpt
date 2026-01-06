package com.ankigpt.data.model

/**
 * 卡片相关数据模型
 */
data class CardGenerateRequest(
    val text: String,
    val cardType: String = "问答题（附翻转卡片）",
    val deckName: String = "default",
    val includePronunciation: Boolean = true
)

data class CardData(
    val id: String,
    val frontContent: String,
    val backContent: String,
    val deckName: String,
    val audioUrl: String? = null,
    val createdAt: String
)

data class CardsResponse(
    val cards: List<CardData>,
    val pagination: Pagination
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

