// webview_utils.js - 工具函数和辅助函数模块

/**
 * 获取输入框的值
 */
function getInputValue(id) {
    return document.getElementById(id).value;
}

/**
 * 获取复选框的值
 */
function getCheckboxValue(id) {
    return document.getElementById(id).checked;
}

/**
 * 安全播放音频的辅助函数（可在全屏和普通模式下使用）
 * 注意：由于浏览器自动播放策略，需要用户交互才能自动播放
 */
function safePlayAudio(audio) {
    if (!audio || !audio.parentElement) {
        console.warn('[safePlayAudio] 音频元素不存在或不在DOM中');
        return; // 音频元素不在DOM中，不播放
    }
    
    // 检查音频是否有有效的src
    if (!audio.src || audio.src === window.location.href || audio.src === '') {
        // 不打印 base64 数据，只显示类型
        let srcInfo = audio.src;
        if (audio.src && audio.src.startsWith('data:')) {
            const match = audio.src.match(/^data:([^;]+);base64,/);
            const mimeType = match ? match[1] : 'unknown';
            srcInfo = `data:${mimeType};base64,... (truncated)`;
        }
        console.warn('[safePlayAudio] 音频源无效，src:', srcInfo);
        return;
    }
    
    console.log('[safePlayAudio] 准备播放音频，readyState:', audio.readyState, 'paused:', audio.paused);
    
    // 尝试播放音频
    const attemptPlay = () => {
        if (!audio.parentElement) {
            console.warn('[safePlayAudio] 元素已被移除');
            return; // 元素已被移除
        }
        
        console.log('[safePlayAudio] 尝试播放，readyState:', audio.readyState);
        audio.currentTime = 0; // 确保从头开始
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('[safePlayAudio] 音频播放成功');
                })
                .catch(e => {
                    // 忽略"元素被移除"的错误
                    if (!e.message.includes('removed from the document')) {
                        console.warn('[safePlayAudio] 播放失败:', e.name, e.message);
                        // 如果是自动播放被阻止，尝试加载后播放
                        if (e.name === 'NotAllowedError' || e.message.includes('play() request was interrupted')) {
                            console.log('[safePlayAudio] 自动播放被阻止，等待用户交互');
                        }
                    }
                });
        } else {
            console.warn('[safePlayAudio] play() 返回 undefined');
        }
    };
    
    // 检查音频是否已加载
    if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
        // 音频已加载，直接尝试播放
        console.log('[safePlayAudio] 音频已就绪，立即播放');
        attemptPlay();
    } else {
        console.log('[safePlayAudio] 等待音频加载，当前readyState:', audio.readyState);
        // 等待音频加载完成
        const onLoadedData = () => {
            if (audio.parentElement) {
                console.log('[safePlayAudio] loadeddata事件触发，readyState:', audio.readyState);
                attemptPlay();
            }
            audio.removeEventListener('loadeddata', onLoadedData);
        };
        audio.addEventListener('loadeddata', onLoadedData);
        
        // 也监听canplay事件，更可靠
        const onCanPlay = () => {
            if (audio.parentElement && audio.readyState >= 2) {
                console.log('[safePlayAudio] canplay事件触发，readyState:', audio.readyState);
                attemptPlay();
            }
            audio.removeEventListener('canplay', onCanPlay);
        };
        audio.addEventListener('canplay', onCanPlay);
        
        // 设置超时，避免无限等待
        setTimeout(() => {
            audio.removeEventListener('loadeddata', onLoadedData);
            audio.removeEventListener('canplay', onCanPlay);
            console.log('[safePlayAudio] 加载超时，尝试强制播放');
            if (audio.readyState >= 1) {
                attemptPlay();
            }
        }, 3000);
    }
}

