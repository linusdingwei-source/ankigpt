package com.ankigpt.ui.viewmodel

import android.media.MediaPlayer
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ankigpt.data.model.TTSData
import com.ankigpt.data.repository.TTSRepository
import com.ankigpt.util.Result
import com.ankigpt.util.TokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import android.util.Base64
import java.io.File
import java.io.FileOutputStream

/**
 * TTS ViewModel
 */
class TTSViewModel(
    private val ttsRepository: TTSRepository = TTSRepository(),
    private val tokenManager: TokenManager
) : ViewModel() {
    
    // 初始状态为 null，表示还没有进行任何操作
    private val _ttsState = MutableStateFlow<Result<TTSData>?>(null)
    val ttsState: StateFlow<Result<TTSData>?> = _ttsState.asStateFlow()
    
    private var mediaPlayer: MediaPlayer? = null
    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()
    
    /**
     * 生成 TTS
     */
    fun generateTTS(text: String) {
        viewModelScope.launch {
            _ttsState.value = Result.Loading
            
            // 拦截器会自动处理认证（Token 或匿名 ID）
            when (val result = ttsRepository.generateTTS("", text)) {
                is Result.Success -> {
                    _ttsState.value = result
                }
                is Result.Error -> {
                    _ttsState.value = result
                }
                else -> {}
            }
        }
    }
    
    /**
     * 播放音频
     */
    fun playAudio(base64Audio: String) {
        viewModelScope.launch {
            try {
                // 停止当前播放
                stopAudio()
                
                // 解码 Base64
                val audioBytes = Base64.decode(base64Audio, Base64.DEFAULT)
                
                // 创建临时文件
                val tempFile = File.createTempFile("tts_audio", ".mp3")
                FileOutputStream(tempFile).use { it.write(audioBytes) }
                
                // 播放
                mediaPlayer = MediaPlayer().apply {
                    setDataSource(tempFile.absolutePath)
                    prepare()
                    start()
                    setOnCompletionListener {
                        _isPlaying.value = false
                        tempFile.delete()
                    }
                    _isPlaying.value = true
                }
            } catch (e: Exception) {
                _ttsState.value = Result.Error("播放失败：${e.message}")
            }
        }
    }
    
    /**
     * 停止播放
     */
    fun stopAudio() {
        mediaPlayer?.release()
        mediaPlayer = null
        _isPlaying.value = false
    }
    
    override fun onCleared() {
        super.onCleared()
        stopAudio()
    }
}

