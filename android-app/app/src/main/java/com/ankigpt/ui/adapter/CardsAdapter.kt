package com.ankigpt.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.ankigpt.data.model.CardData
import com.ankigpt.databinding.ItemCardBinding

/**
 * 卡片列表 Adapter
 */
class CardsAdapter : ListAdapter<CardData, CardsAdapter.CardViewHolder>(CardDiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CardViewHolder {
        val binding = ItemCardBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return CardViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: CardViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    class CardViewHolder(
        private val binding: ItemCardBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(card: CardData) {
            binding.frontContentText.text = card.frontContent
            binding.backContentText.text = card.backContent
            binding.deckNameText.text = card.deckName
        }
    }
    
    class CardDiffCallback : DiffUtil.ItemCallback<CardData>() {
        override fun areItemsTheSame(oldItem: CardData, newItem: CardData): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: CardData, newItem: CardData): Boolean {
            return oldItem == newItem
        }
    }
}

