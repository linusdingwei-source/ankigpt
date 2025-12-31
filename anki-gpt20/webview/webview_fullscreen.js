// webview_fullscreen.js - 全屏模式模块

// 全屏模式相关变量
window.isFullscreenMode = false; // 全屏模式状态
window.fullscreenAutoPlay = true; // 全屏模式下切换卡片时自动播放音频

/**
 * 切换全屏模式
 */
function toggleFullscreen() {
    if (window.isFullscreenMode) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

/**
 * 进入全屏模式
 */
function enterFullscreen() {
    console.log('[enterFullscreen] 进入全屏模式');
    const deckCardList = typeof getDeckCardList === 'function' ? getDeckCardList() : [];
    console.log('[enterFullscreen] 卡片列表长度:', deckCardList.length);
    
    if (deckCardList.length === 0) {
        console.warn('[enterFullscreen] 卡片列表为空');
        if (typeof window.displayTemporaryMessage === 'function') {
            window.displayTemporaryMessage('请先选择一个牌组并加载卡片', 'orange', 3000);
        }
        return;
    }
    
    // 找到当前选中的卡片
    const selectedLi = document.querySelector('#deckCardList li.selected');
    console.log('[enterFullscreen] 选中的列表项:', selectedLi);
    
    let startIndex = 0;
    if (selectedLi && selectedLi.dataset.index !== undefined) {
        startIndex = parseInt(selectedLi.dataset.index);
        console.log('[enterFullscreen] 使用选中卡片的索引:', startIndex);
    } else if (deckCardList.length > 0) {
        startIndex = 0;
        console.log('[enterFullscreen] 没有选中项，使用第一个卡片，索引:', startIndex);
    } else {
        console.warn('[enterFullscreen] 没有可显示的卡片');
        if (typeof window.displayTemporaryMessage === 'function') {
            window.displayTemporaryMessage('没有可显示的卡片', 'orange', 3000);
        }
        return;
    }
    
    const fullscreenContainer = document.getElementById('fullscreenContainer');
    console.log('[enterFullscreen] 全屏容器:', fullscreenContainer);
    
    if (!fullscreenContainer) {
        console.error('[enterFullscreen] 全屏容器不存在！');
        return;
    }
    
    window.isFullscreenMode = true;
    document.body.classList.add('fullscreen-mode');
    
    // 直接通过 style 控制显示，而不是依赖 CSS class
    fullscreenContainer.style.display = 'flex';
    
    console.log('[enterFullscreen] 全屏模式已激活');
    console.log('[enterFullscreen] 全屏容器display:', fullscreenContainer.style.display);
    console.log('[enterFullscreen] 全屏容器computed display:', window.getComputedStyle(fullscreenContainer).display);
    
    // 加载当前卡片
    if (typeof loadCardInFullscreen === 'function') {
        loadCardInFullscreen(startIndex);
    }
    if (typeof updateFullscreenCounter === 'function') {
        updateFullscreenCounter();
    }
}

/**
 * 退出全屏模式
 */
function exitFullscreen() {
    console.log('[exitFullscreen] 退出全屏模式');
    window.isFullscreenMode = false;
    document.body.classList.remove('fullscreen-mode');
    const fullscreenContainer = document.getElementById('fullscreenContainer');
    if (fullscreenContainer) {
        // 直接通过 style 控制隐藏
        fullscreenContainer.style.display = 'none';
        console.log('[exitFullscreen] 全屏容器已隐藏');
    }
}

/**
 * 在全屏模式下加载卡片
 */
function loadCardInFullscreen(index, autoPlay = false) {
    console.log('[loadCardInFullscreen] 加载卡片，索引:', index, '自动播放:', autoPlay);
    const deckCardList = typeof getDeckCardList === 'function' ? getDeckCardList() : [];
    console.log('[loadCardInFullscreen] 卡片列表长度:', deckCardList.length);
    
    if (index < 0 || index >= deckCardList.length) {
        console.warn('[loadCardInFullscreen] 索引超出范围:', index);
        return;
    }
    
    if (typeof setCurrentCardIndex === 'function') {
        setCurrentCardIndex(index);
    }
    const card = deckCardList[index];
    console.log('[loadCardInFullscreen] 卡片数据:', card);
    
    if (card && card.nid) {
        const fullscreenPreview = document.getElementById('fullscreenPreview');
        if (fullscreenPreview) {
            console.log('[loadCardInFullscreen] 设置加载占位符');
            fullscreenPreview.innerHTML = '<div class="preview-placeholder loading"><p>正在加载...</p></div>';
            console.log('[loadCardInFullscreen] 发送请求获取卡片详情，NID:', card.nid);
            
            // 保存自动播放标志
            fullscreenPreview.dataset.autoPlay = autoPlay ? 'true' : 'false';
            
            pycmd(`fetch_card_details::[${parseInt(card.nid)}]`);
        } else {
            console.error('[loadCardInFullscreen] 全屏预览容器不存在！');
        }
    } else {
        console.warn('[loadCardInFullscreen] 卡片数据无效或没有NID');
    }
    if (typeof updateFullscreenCounter === 'function') {
        updateFullscreenCounter();
    }
}

/**
 * 更新全屏模式下的卡片计数器
 */
function updateFullscreenCounter() {
    const counter = document.getElementById('fullscreenCardCounter');
    const deckCardList = typeof getDeckCardList === 'function' ? getDeckCardList() : [];
    const currentCardIndex = typeof getCurrentCardIndex === 'function' ? getCurrentCardIndex() : -1;
    if (counter && deckCardList.length > 0 && currentCardIndex >= 0) {
        counter.textContent = `${currentCardIndex + 1} / ${deckCardList.length}`;
    }
}

/**
 * 处理全屏模式下的自动播放
 */
function handleFullscreenAutoPlay(fullscreenPreview) {
    console.log('[handleFullscreenAutoPlay] 准备自动播放音频');
    // 等待音频元素加载完成后再播放
    const audioPlayer = fullscreenPreview.querySelector('.preview-audio');
    if (audioPlayer) {
        console.log('[handleFullscreenAutoPlay] 找到音频播放器，src:', audioPlayer.src ? '有' : '无', 'readyState:', audioPlayer.readyState);
        
        // 使用标志防止重复播放
        let hasPlayed = false;
        let timeoutId = null;
        
        // 清理函数
        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            audioPlayer.removeEventListener('canplay', tryAutoPlay);
            audioPlayer.removeEventListener('loadeddata', tryAutoPlay);
            audioPlayer.removeEventListener('canplaythrough', tryAutoPlay);
        };
        
        // 监听音频加载完成
        const tryAutoPlay = () => {
            // 防止重复播放
            if (hasPlayed) {
                console.log('[handleFullscreenAutoPlay] 已经播放过，跳过');
                cleanup();
                return;
            }
            
            if (audioPlayer.src && audioPlayer.readyState >= 2) {
                console.log('[handleFullscreenAutoPlay] 音频已加载，开始自动播放，readyState:', audioPlayer.readyState);
                hasPlayed = true; // 标记为已播放
                cleanup(); // 立即清理事件监听器和超时
                
                audioPlayer.currentTime = 0;
                // 直接尝试播放，因为这是用户交互（按空格键）触发的
                const playPromise = audioPlayer.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('[handleFullscreenAutoPlay] 自动播放成功');
                        })
                        .catch(e => {
                            console.warn('[handleFullscreenAutoPlay] 自动播放失败:', e.name, e.message);
                            hasPlayed = false; // 播放失败，重置标志
                            // 如果自动播放失败，尝试使用safePlayAudio
                            if (typeof safePlayAudio === 'function') {
                                safePlayAudio(audioPlayer);
                            }
                        });
                }
            }
        };
        
        // 如果已经加载完成，直接播放
        if (audioPlayer.readyState >= 2) {
            console.log('[handleFullscreenAutoPlay] 音频已就绪，立即播放');
            hasPlayed = true; // 标记为已播放
            setTimeout(() => {
                if (!hasPlayed) return; // 双重检查
                audioPlayer.currentTime = 0;
                const playPromise = audioPlayer.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('[handleFullscreenAutoPlay] 自动播放成功（立即）');
                        })
                        .catch(e => {
                            console.warn('[handleFullscreenAutoPlay] 自动播放失败（立即）:', e.name, e.message);
                            hasPlayed = false; // 播放失败，重置标志
                            if (typeof safePlayAudio === 'function') {
                                safePlayAudio(audioPlayer);
                            }
                        });
                }
            }, 50);
        } else {
            console.log('[handleFullscreenAutoPlay] 等待音频加载，当前readyState:', audioPlayer.readyState);
            // 等待加载完成
            audioPlayer.addEventListener('canplay', tryAutoPlay);
            audioPlayer.addEventListener('loadeddata', tryAutoPlay);
            audioPlayer.addEventListener('canplaythrough', tryAutoPlay);
            // 设置超时，避免无限等待
            timeoutId = setTimeout(() => {
                if (!hasPlayed && audioPlayer.src && audioPlayer.readyState >= 1) {
                    console.log('[handleFullscreenAutoPlay] 音频加载超时，尝试强制播放');
                    tryAutoPlay();
                } else {
                    cleanup();
                }
            }, 2000);
        }
    } else {
        console.warn('[handleFullscreenAutoPlay] 未找到音频播放器');
    }
}

/**
 * 播放全屏模式下的音频
 */
function playFullscreenAudio() {
    if (!window.isFullscreenMode) {
        return;
    }
    
    const fullscreenPreview = document.getElementById('fullscreenPreview');
    if (!fullscreenPreview) {
        console.warn('[playFullscreenAudio] 全屏预览容器不存在');
        return;
    }
    
    const audioPlayer = fullscreenPreview.querySelector('.preview-audio');
    if (audioPlayer && audioPlayer.src) {
        console.log('[playFullscreenAudio] 开始播放音频');
        audioPlayer.currentTime = 0; // 从头开始播放
        if (typeof safePlayAudio === 'function') {
            safePlayAudio(audioPlayer);
        }
    } else {
        console.warn('[playFullscreenAudio] 音频播放器不存在或没有音频源');
    }
}

/**
 * 切换全屏模式下的音频播放/暂停
 */
function toggleFullscreenAudio() {
    if (!window.isFullscreenMode) {
        return;
    }
    
    const fullscreenPreview = document.getElementById('fullscreenPreview');
    if (!fullscreenPreview) {
        console.warn('[toggleFullscreenAudio] 全屏预览容器不存在');
        return;
    }
    
    const audioPlayer = fullscreenPreview.querySelector('.preview-audio');
    if (audioPlayer && audioPlayer.src) {
        if (audioPlayer.paused) {
            console.log('[toggleFullscreenAudio] 继续播放');
            if (typeof safePlayAudio === 'function') {
                safePlayAudio(audioPlayer);
            }
        } else {
            console.log('[toggleFullscreenAudio] 暂停播放');
            audioPlayer.pause();
        }
    } else {
        console.warn('[toggleFullscreenAudio] 音频播放器不存在或没有音频源');
    }
}

/**
 * 处理全屏模式下的键盘事件
 */
function handleFullscreenKeyboard(event) {
    if (!window.isFullscreenMode) {
        return;
    }
    
    console.log('[handleFullscreenKeyboard] 按键:', event.key, 'keyCode:', event.keyCode);
    
    // ESC 退出全屏 - 需要阻止事件冒泡，避免被Anki捕获
    if (event.key === 'Escape' || event.keyCode === 27) {
        console.log('[handleFullscreenKeyboard] ESC键按下，退出全屏');
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        exitFullscreen();
        return false;
    }
    
    // Tab键：禁用默认行为，避免焦点切换
    if (event.key === 'Tab' || event.keyCode === 9) {
        console.log('[handleFullscreenKeyboard] Tab键按下，已禁用');
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
    
    const deckCardList = typeof getDeckCardList === 'function' ? getDeckCardList() : [];
    const currentCardIndex = typeof getCurrentCardIndex === 'function' ? getCurrentCardIndex() : -1;
    
    // 空格键：下一个卡片 + 自动播放
    if (event.key === ' ' || event.keyCode === 32) {
        console.log('[handleFullscreenKeyboard] 空格键按下，切换到下一个卡片');
        event.preventDefault();
        event.stopPropagation();
        if (deckCardList.length > 0) {
            const nextIndex = (currentCardIndex + 1) % deckCardList.length;
            if (typeof loadCardInFullscreen === 'function') {
                loadCardInFullscreen(nextIndex, true); // true表示自动播放
            }
        }
        return false;
    }
    
    // 左箭头：上一个卡片 + 自动播放
    if (event.key === 'ArrowLeft' || event.keyCode === 37) {
        console.log('[handleFullscreenKeyboard] 左箭头按下，切换到上一个卡片');
        event.preventDefault();
        event.stopPropagation();
        if (deckCardList.length > 0) {
            const prevIndex = currentCardIndex > 0 ? currentCardIndex - 1 : deckCardList.length - 1;
            if (typeof loadCardInFullscreen === 'function') {
                loadCardInFullscreen(prevIndex, true); // true表示自动播放
            }
        }
        return false;
    }
    
    // 右箭头：下一个卡片 + 自动播放
    if (event.key === 'ArrowRight' || event.keyCode === 39) {
        console.log('[handleFullscreenKeyboard] 右箭头按下，切换到下一个卡片');
        event.preventDefault();
        event.stopPropagation();
        if (deckCardList.length > 0) {
            const nextIndex = (currentCardIndex + 1) % deckCardList.length;
            if (typeof loadCardInFullscreen === 'function') {
                loadCardInFullscreen(nextIndex, true); // true表示自动播放
            }
        }
        return false;
    }
    
    // 上箭头：重新播放当前卡片音频
    if (event.key === 'ArrowUp' || event.keyCode === 38) {
        console.log('[handleFullscreenKeyboard] 上箭头按下，重新播放音频');
        event.preventDefault();
        event.stopPropagation();
        playFullscreenAudio();
        return false;
    }
    
    // 下箭头：暂停/继续播放
    if (event.key === 'ArrowDown' || event.keyCode === 40) {
        console.log('[handleFullscreenKeyboard] 下箭头按下，暂停/继续播放');
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreenAudio();
        return false;
    }
    
    // Enter键：播放/暂停音频
    if (event.key === 'Enter' || event.keyCode === 13) {
        console.log('[handleFullscreenKeyboard] Enter键按下，播放/暂停音频');
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreenAudio();
        return false;
    }
}

