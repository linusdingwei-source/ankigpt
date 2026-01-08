package com.ankigpt.ui

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.ankigpt.R
import com.ankigpt.databinding.ActivityMainBinding
import com.ankigpt.ui.fragment.CardsFragment
import com.ankigpt.ui.fragment.GenerateCardFragment
import com.ankigpt.data.api.RetrofitClient
import com.ankigpt.ui.fragment.ProfileFragment
import com.ankigpt.ui.fragment.TTSFragment
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.launch

/**
 * 主 Activity
 */
class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var tokenManager: TokenManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        tokenManager = TokenManager(this)
        
        // 初始化 Retrofit 客户端（需要 Context 来管理匿名 ID）
        RetrofitClient.initialize(this)
        
        setSupportActionBar(binding.toolbar)
        
        // 默认显示 TTS Fragment
        if (savedInstanceState == null) {
            replaceFragment(TTSFragment())
        }
        
        binding.bottomNavigation.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_tts -> {
                    replaceFragment(TTSFragment())
                    true
                }
                R.id.nav_generate -> {
                    replaceFragment(GenerateCardFragment())
                    true
                }
                R.id.nav_cards -> {
                    replaceFragment(CardsFragment())
                    true
                }
                R.id.nav_profile -> {
                    replaceFragment(ProfileFragment())
                    true
                }
                else -> false
            }
        }
    }
    
    private fun replaceFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }
}
