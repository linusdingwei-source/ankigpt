// webview_preview.js - 卡片预览渲染模块

// 在文件开头检查依赖函数是否已加载
(function() {
    console.log('[webview_preview] 脚本开始加载');
    console.log('[webview_preview] 检查依赖函数:', {
        renderInteractiveSentence: typeof renderInteractiveSentence,
        windowRenderInteractiveSentence: typeof window !== 'undefined' ? typeof window.renderInteractiveSentence : 'window未定义'
    });
})();

/**
 * 统一的卡片预览渲染函数
 * @param {HTMLElement} container - 渲染的目标容器
 * @param {object} data - 卡片数据对象
 */
function renderCardPreview(container, data) {
    console.log('[renderCardPreview] 开始渲染，容器:', container ? container.id : '未知');
    console.log('[renderCardPreview] 数据有效性:', data ? (data.success ? '成功' : '失败') : '无数据');
    
    container.innerHTML = ''; // 清空容器

    if (!data || !data.success) {
        console.warn('[renderCardPreview] 数据无效，显示错误占位符');
        container.innerHTML = '<div class="preview-placeholder"><p>无法加载预览</p></div>';
        return;
    }

    const isExistingCard = data.isExistingCard || false;
    const previewHtml = `
        <div class="preview-section-inner" style="color: #ffffff !important; background-color: #2e2e2e !important;">
            <h2 style="color: #00aaff !important;">${isExistingCard ? '卡片预览' : '生成预览'}</h2>
            <div class="preview-group">
                <strong style="color: #ffffff !important;">正面:</strong>
                <div class="interactive-sentence" style="display: none; color: #ffffff !important; background-color: #4a4a4a !important;"></div>
                <div class="preview-content front-content" style="display: none; color: #ffffff !important; background-color: #4a4a4a !important;"></div>
            </div>
            <div class="preview-group stretch">
                <strong style="color: #ffffff !important;">背面:</strong>
                <div class="preview-content back-content" style="color: #ffffff !important; background-color: #4a4a4a !important;"></div>
            </div>
            <div class="preview-audio-container" style="display: none;">
                <strong style="color: #ffffff !important;">音频:</strong>
                <audio class="preview-audio" controls></audio>
            </div>
            ${!isExistingCard ? '<button class="styled-button add-to-anki-btn">添加到 Anki</button>' : ''}
        </div>
    `;
    container.innerHTML = previewHtml;
    console.log('[renderCardPreview] HTML已插入，容器ID:', container.id);

    // 填充内容
    const backContentEl = container.querySelector('.back-content');
    if (backContentEl) {
        backContentEl.innerHTML = data.backContent || '';
        console.log('[renderCardPreview] 背面内容已填充，长度:', data.backContent ? data.backContent.length : 0);
    } else {
        console.error('[renderCardPreview] 未找到背面内容容器！');
    }
    
    // 处理音频：优先使用audioBase64，如果没有则使用audioUrl
    if (data.audioBase64 || data.audioUrl) {
        const audioContainer = container.querySelector('.preview-audio-container');
        const audioPlayer = container.querySelector('.preview-audio');
        if (audioContainer && audioPlayer) {
            audioContainer.style.display = 'block';
            if (data.audioBase64) {
            audioPlayer.src = data.audioBase64;
            } else if (data.audioUrl) {
                audioPlayer.src = data.audioUrl;
            }
            console.log('[renderCardPreview] 音频已设置', data.audioBase64 ? '(base64)' : '(URL)');
            
            // 为音频控件添加preload属性，确保音频可以预加载
            audioPlayer.setAttribute('preload', 'auto');
            
            // 初始化音频控制按钮（循环播放和播放速度）
            initAudioControls(audioContainer, audioPlayer);
            
            // 监听音频加载错误（仅记录错误，不记录成功）
            audioPlayer.addEventListener('error', (e) => {
                const error = audioPlayer.error;
                let errorMessage = '未知错误';
                
                if (error) {
                    switch (error.code) {
                        case error.MEDIA_ERR_ABORTED:
                            errorMessage = '音频加载被中止';
                            break;
                        case error.MEDIA_ERR_NETWORK:
                            errorMessage = '网络错误：无法加载音频';
                            break;
                        case error.MEDIA_ERR_DECODE:
                            errorMessage = '解码错误：音频格式不支持或文件损坏';
                            break;
                        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMessage = '不支持的音频格式或源不可用（可能是URL已过期）';
                            break;
                        default:
                            errorMessage = `音频加载错误 (代码: ${error.code})`;
                    }
                }
                
                const src = audioPlayer.src || audioPlayer.getAttribute('src') || 'none';
                const srcDisplay = src.length > 100 ? src.substring(0, 100) + '...' : src;
                
                console.error('[音频] 加载错误:', {
                    message: errorMessage,
                    code: error ? error.code : 'unknown',
                    src: srcDisplay,
                    networkState: audioPlayer.networkState,
                    readyState: audioPlayer.readyState,
                    duration: audioPlayer.duration
                });
                
                // 如果是网络错误或CORS问题，尝试提供更详细的提示
                if (error && (error.code === error.MEDIA_ERR_NETWORK || error.code === error.MEDIA_ERR_SRC_NOT_SUPPORTED)) {
                    if (src && src.startsWith('http')) {
                        try {
                            const url = new URL(src);
                            const currentOrigin = window.location.origin;
                            if (url.origin !== currentOrigin && !url.origin.includes('127.0.0.1') && !url.origin.includes('localhost')) {
                                console.warn('[音频] 可能是CORS问题：跨域音频URL', url.origin);
                            }
                            
                            // 检查是否是OSS签名URL，可能已过期
                            if (url.searchParams.has('Expires') || url.searchParams.has('OSSAccessKeyId')) {
                                const expires = url.searchParams.get('Expires');
                                if (expires) {
                                    const expireTime = parseInt(expires) * 1000; // 转换为毫秒
                                    const now = Date.now();
                                    if (now > expireTime) {
                                        console.error('[音频] OSS签名URL已过期！过期时间:', new Date(expireTime).toLocaleString(), '当前时间:', new Date(now).toLocaleString());
                                        // 显示用户友好的错误提示
                                        const errorMsg = document.createElement('div');
                                        errorMsg.style.cssText = 'padding: 10px; margin: 10px 0; background-color: #ff4444; color: white; border-radius: 4px;';
                                        errorMsg.textContent = '音频URL已过期，请重新转写音频';
                                        audioContainer.insertBefore(errorMsg, audioPlayer);
                                    } else {
                                        console.log('[音频] OSS签名URL尚未过期，剩余时间:', Math.floor((expireTime - now) / 1000), '秒');
                                    }
                                }
                            }
                        } catch (urlError) {
                            console.warn('[音频] URL解析失败:', urlError);
                        }
                    }
                }
            });
            
            // 监听音频加载成功
            audioPlayer.addEventListener('loadeddata', () => {
                const duration = audioPlayer.duration;
                console.log('[音频] 音频数据已加载，时长:', duration, '秒');
                if (isNaN(duration) || duration <= 0) {
                    console.warn('[音频] 警告：音频时长无效，可能是URL已过期或音频文件不存在');
                }
            });
            
            // 监听音频加载元数据
            audioPlayer.addEventListener('loadedmetadata', () => {
                const duration = audioPlayer.duration;
                console.log('[音频] 音频元数据已加载，时长:', duration, '秒');
                if (isNaN(duration) || duration <= 0) {
                    console.warn('[音频] 警告：音频时长无效，可能是URL已过期或音频文件不存在');
                    // 尝试重新加载
                    console.log('[音频] 尝试重新加载音频...');
                    const currentSrc = audioPlayer.src;
                    audioPlayer.src = '';
                    setTimeout(() => {
                        audioPlayer.src = currentSrc;
                        audioPlayer.load();
                    }, 100);
                }
            });
            
            // 监听音频加载开始
            audioPlayer.addEventListener('loadstart', () => {
                // 不打印 base64 数据，只显示类型和长度
                let srcInfo = 'none';
                if (audioPlayer.src) {
                    if (audioPlayer.src.startsWith('data:')) {
                        // base64 数据 URI，只显示类型和长度
                        const match = audioPlayer.src.match(/^data:([^;]+);base64,/);
                        const mimeType = match ? match[1] : 'unknown';
                        const base64Length = audioPlayer.src.length - (match ? match[0].length : 0);
                        srcInfo = `data:${mimeType};base64,... (${base64Length} chars)`;
                    } else if (audioPlayer.src.startsWith('http://') || audioPlayer.src.startsWith('https://')) {
                        // URL，显示完整 URL
                        srcInfo = audioPlayer.src;
                    } else {
                        // 其他类型，显示前50字符
                        srcInfo = audioPlayer.src.length > 50 ? audioPlayer.src.substring(0, 50) + '...' : audioPlayer.src;
                    }
                }
                console.log('[音频] 开始加载音频，src:', srcInfo);
            });
            
            // 监听音频加载进度
            audioPlayer.addEventListener('progress', () => {
                if (audioPlayer.buffered.length > 0) {
                    const bufferedEnd = audioPlayer.buffered.end(audioPlayer.buffered.length - 1);
                    const duration = audioPlayer.duration;
                    if (duration > 0) {
                        const percent = (bufferedEnd / duration * 100).toFixed(1);
                        console.log('[音频] 加载进度:', percent + '%');
                    }
                }
            });
            
            // 在全屏模式下，为音频控件添加键盘事件处理
            if (container.id === 'fullscreenPreview') {
                // 阻止音频控件的默认键盘行为，让我们的全屏键盘处理器接管
                const handleAudioKeydown = (e) => {
                    const key = e.key;
                    const keyCode = e.keyCode;
                    // 这些键应该由全屏键盘处理器处理
                    if (key === ' ' || keyCode === 32 ||
                        key === 'ArrowLeft' || keyCode === 37 ||
                        key === 'ArrowRight' || keyCode === 39 ||
                        key === 'ArrowUp' || keyCode === 38 ||
                        key === 'ArrowDown' || keyCode === 40 ||
                        key === 'Enter' || keyCode === 13 ||
                        key === 'Tab' || keyCode === 9 ||
                        key === 'Escape' || keyCode === 27) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        // 手动触发全屏键盘处理
                        if (typeof handleFullscreenKeyboard === 'function') {
                            handleFullscreenKeyboard(e);
                        }
                        return false;
                    }
                };
                // 移除旧的事件监听器（如果存在）
                audioPlayer.removeEventListener('keydown', handleAudioKeydown);
                // 添加新的事件监听器（使用捕获阶段）
                audioPlayer.addEventListener('keydown', handleAudioKeydown, true);
            }
        } else {
            console.warn('[renderCardPreview] 音频容器或播放器不存在');
        }
    } else {
        console.log('[renderCardPreview] 没有音频数据');
    }

    // 正面渲染 - 确保只有一个容器显示，避免空白
    const interactiveContainer = container.querySelector('.interactive-sentence');
    const plainFrontContainer = container.querySelector('.front-content');
    
    console.log('[renderCardPreview] 正面内容:', data.frontContent ? data.frontContent.substring(0, 50) + '...' : '无');
    console.log('[renderCardPreview] 时间戳数据:', data.timestamps ? `有 ${data.timestamps.length} 个` : '无');
    console.log('[renderCardPreview] 交互式播放器启用:', window.ankiGptConfig ? window.ankiGptConfig.interactive_player_enabled : '配置未加载');
    
    // 检查是否有优化后的文本（ASR转写优化后的文本）
    // 现在时间戳已经对齐到优化后的文本，所以可以启用交互式播放器
    const hasOptimizedText = data.frontContent && data.audioUrl; // ASR转写结果会有audioUrl
    
    if (data.timestamps && data.timestamps.length > 0 && window.ankiGptConfig && window.ankiGptConfig.interactive_player_enabled) {
        // 现在时间戳已经对齐到优化后的文本，所以可以启用交互式播放器
        console.log('[renderCardPreview] 使用交互式句子渲染，时间戳数量:', data.timestamps.length);
        if (interactiveContainer) {
            interactiveContainer.style.display = 'block';
            interactiveContainer.style.visibility = 'visible';
            // 保存当前预览数据，供时间戳编辑使用
            window.currentPreviewData = JSON.parse(JSON.stringify(data));
            
            // 尝试获取 renderInteractiveSentence 函数（可能在全局作用域或 window 对象上）
            let renderFn = null;
            
            // 首先检查全局作用域
            if (typeof renderInteractiveSentence === 'function') {
                renderFn = renderInteractiveSentence;
                console.log('[renderCardPreview] 从全局作用域获取renderInteractiveSentence');
            }
            // 然后检查 window 对象
            else if (typeof window !== 'undefined' && typeof window.renderInteractiveSentence === 'function') {
                renderFn = window.renderInteractiveSentence;
                console.log('[renderCardPreview] 从window对象获取renderInteractiveSentence');
            }
            // 如果还是找不到，等待一小段时间后重试（可能是脚本加载顺序问题）
            else {
                console.warn('[renderCardPreview] renderInteractiveSentence未找到，等待200ms后重试...');
                setTimeout(() => {
                    // 再次检查函数是否可用
                    if (typeof renderInteractiveSentence === 'function') {
                        renderFn = renderInteractiveSentence;
                    } else if (typeof window !== 'undefined' && typeof window.renderInteractiveSentence === 'function') {
                        renderFn = window.renderInteractiveSentence;
                    }
                    
                    if (typeof renderFn === 'function') {
                        console.log('[renderCardPreview] 延迟后找到renderInteractiveSentence，开始渲染');
                        renderFn(interactiveContainer, data.timestamps, container);
                        
                        // 延迟绑定音频事件
                        setTimeout(() => {
                            if (typeof attachAudioEventListeners === 'function') {
                                attachAudioEventListeners(container);
                            } else if (typeof window !== 'undefined' && typeof window.attachAudioEventListeners === 'function') {
                                window.attachAudioEventListeners(container);
                            }
                        }, 50);
                    } else {
                        console.error('[renderCardPreview] 延迟后仍未找到renderInteractiveSentence，回退到普通文本');
                        console.error('[renderCardPreview] 调试信息:', {
                            'renderInteractiveSentence (global)': typeof renderInteractiveSentence,
                            'window.renderInteractiveSentence': typeof window !== 'undefined' ? typeof window.renderInteractiveSentence : 'window未定义',
                            'window对象存在': typeof window !== 'undefined'
                        });
                        if (plainFrontContainer) {
                            plainFrontContainer.style.display = 'block';
                            plainFrontContainer.innerHTML = (data.frontContent || '').replace(/\n/g, '<br>');
                            interactiveContainer.style.display = 'none';
                        }
                    }
                }, 200);
                return; // 提前返回，等待延迟检查
            }
            
            if (typeof renderFn === 'function') {
                console.log('[renderCardPreview] 调用renderInteractiveSentence');
                renderFn(interactiveContainer, data.timestamps, container);
                
                // 验证渲染结果
                setTimeout(() => {
                    const renderedWords = interactiveContainer.querySelectorAll('.interactive-word');
                    const renderedText = Array.from(renderedWords).map(w => w.textContent).join('');
                    console.log('[renderCardPreview] 渲染验证 - 单词数量:', renderedWords.length);
                    console.log('[renderCardPreview] 渲染验证 - 文本长度:', renderedText.length);
                    console.log('[renderCardPreview] 渲染验证 - 前100字符:', renderedText.substring(0, 100));
                    
                    if (renderedWords.length === 0) {
                        console.error('[renderCardPreview] 错误：交互式容器中没有渲染任何单词！');
                        // 如果交互式渲染失败，回退到普通文本
                        if (plainFrontContainer) {
                            plainFrontContainer.style.display = 'block';
                            plainFrontContainer.innerHTML = (data.frontContent || '').replace(/\n/g, '<br>');
                            interactiveContainer.style.display = 'none';
                            console.log('[renderCardPreview] 已回退到普通文本渲染');
                        }
                    }
                }, 100);
            } else {
                console.error('[renderCardPreview] renderInteractiveSentence函数不存在！', 
                    '全局检查:', typeof renderInteractiveSentence,
                    'window检查:', typeof window !== 'undefined' ? typeof window.renderInteractiveSentence : 'window未定义');
                // 回退到普通文本
                if (plainFrontContainer) {
                    plainFrontContainer.style.display = 'block';
                    plainFrontContainer.innerHTML = (data.frontContent || '').replace(/\n/g, '<br>');
                    interactiveContainer.style.display = 'none';
                }
            }
            // 延迟一点绑定事件，确保DOM已完全更新
            setTimeout(() => {
                if (typeof attachAudioEventListeners === 'function') {
                    attachAudioEventListeners(container);
                }
            }, 50);
        } else {
            console.error('[renderCardPreview] 交互式容器不存在！');
            // 回退到普通文本
            if (plainFrontContainer) {
                plainFrontContainer.style.display = 'block';
                plainFrontContainer.innerHTML = (data.frontContent || '').replace(/\n/g, '<br>');
            }
        }
        if (plainFrontContainer) {
            plainFrontContainer.style.display = 'none';
        }
    } else {
        // 使用普通文本渲染（包括优化后的文本）
        console.log('[renderCardPreview] 使用普通文本渲染', hasOptimizedText ? '(优化后的文本)' : '');
        if (interactiveContainer) {
            interactiveContainer.style.display = 'none';
        }
        if (plainFrontContainer) {
            plainFrontContainer.style.display = 'block';
            plainFrontContainer.innerHTML = (data.frontContent || '').replace(/\n/g, '<br>');
            console.log('[renderCardPreview] 正面内容已填充');
        } else {
            console.error('[renderCardPreview] 正面内容容器不存在！');
        }
    }
    
    console.log('[renderCardPreview] 渲染完成，容器内容长度:', container.innerHTML.length);
    
    // 检查容器是否可见（全屏模式调试）
    if (container.id === 'fullscreenPreview') {
        const computedStyle = window.getComputedStyle(container);
        const parentStyle = window.getComputedStyle(container.parentElement);
        console.log('[renderCardPreview] 全屏预览容器样式检查:');
        console.log('  - display:', computedStyle.display);
        console.log('  - visibility:', computedStyle.visibility);
        console.log('  - opacity:', computedStyle.opacity);
        console.log('  - width:', computedStyle.width);
        console.log('  - height:', computedStyle.height);
        console.log('  - parent display:', parentStyle.display);
        console.log('  - parent width:', parentStyle.width);
        console.log('  - parent height:', parentStyle.height);
        console.log('  - parent position:', parentStyle.position);
        
        // 输出详细的rect信息
        const rect = container.getBoundingClientRect();
        const parentRect = container.parentElement.getBoundingClientRect();
        console.log('[renderCardPreview] 容器rect详情:', {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
        });
        console.log('[renderCardPreview] 父容器rect详情:', {
            x: parentRect.x,
            y: parentRect.y,
            width: parentRect.width,
            height: parentRect.height,
            top: parentRect.top,
            left: parentRect.left
        });
        
        // 检查内容是否真的存在
        const innerContent = container.querySelector('.preview-section-inner');
        if (innerContent) {
            const innerRect = innerContent.getBoundingClientRect();
            console.log('[renderCardPreview] 内部内容rect:', {
                x: innerRect.x,
                y: innerRect.y,
                width: innerRect.width,
                height: innerRect.height
            });
            console.log('[renderCardPreview] 内部内容computed color:', window.getComputedStyle(innerContent).color);
            console.log('[renderCardPreview] 内部内容computed background:', window.getComputedStyle(innerContent).backgroundColor);
        } else {
            console.error('[renderCardPreview] 未找到 .preview-section-inner 元素！');
        }
        
        // 如果宽度或高度是auto，强制设置
        if (computedStyle.width === 'auto' || computedStyle.width === '0px') {
            container.style.width = '100%';
            container.style.minHeight = '100%';
            console.log('[renderCardPreview] 强制设置容器宽度和高度');
        }
        
        // 强制设置文字颜色，确保可见
        container.style.color = '#ffffff';
        if (innerContent) {
            innerContent.style.color = '#ffffff';
            innerContent.style.backgroundColor = '#2e2e2e';
        }
    }

    // 为 "添加到Anki" 按钮绑定事件
    const addButton = container.querySelector('.add-to-anki-btn');
    if (addButton) {
        addButton.addEventListener('click', () => {
            if (typeof window.setLoading === 'function') {
                window.setLoading(true, '正在添加到 Anki...');
            }
            // 根据当前激活的tab获取对应的输入值
            let cardType, deckName, includePronunciation;
            const asrTab = document.getElementById('asrTab');
            if (asrTab && asrTab.classList.contains('active')) {
                cardType = getInputValue('asrCardType');
                deckName = getInputValue('asrDeckName');
                includePronunciation = true; // ASR转写默认包含音频
            } else {
                cardType = getInputValue('cardType');
                deckName = getInputValue('deckName');
                includePronunciation = getCheckboxValue('includePronunciation');
            }
            
            // 使用调整后的时间戳（如果存在）
            const timestampsToUse = window.currentPreviewData?.timestamps || data.timestamps;
            const args = [
                data.frontContent,
                data.backContent,
                data.audioFilename || (data.audioUrl ? data.audioUrl : ''),
                cardType,
                deckName,
                includePronunciation,
                timestampsToUse
            ];
            pycmd(`add_to_anki::${JSON.stringify(args)}`);
        });
    }
    
    // 已存在卡片的编辑和删除功能已移至左侧卡片列表，此处不再需要
    
    // 添加拆分按钮到正面卡片标题旁边（只要有正面内容就显示）
    // 这个函数会在渲染完成后被调用，确保按钮能够正确显示
    function addSplitButton() {
        if (data.frontContent) {
            const previewGroup = container.querySelector('.preview-group');
            if (previewGroup) {
                const titleStrong = previewGroup.querySelector('strong');
                if (titleStrong) {
                    // 检查是否已经有标题包装器
                    let titleWrapper = titleStrong.parentElement;
                    if (!titleWrapper.classList.contains('preview-group-title')) {
                        titleWrapper = document.createElement('div');
                        titleWrapper.className = 'preview-group-title';
                        titleWrapper.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';
                        titleStrong.parentNode.insertBefore(titleWrapper, titleStrong);
                        titleWrapper.appendChild(titleStrong);
                    }
                    
                    // 检查是否已经添加过拆分按钮
                    let splitButton = previewGroup.querySelector('.split-sentences-btn');
                    if (!splitButton) {
                        splitButton = document.createElement('button');
                        splitButton.className = 'split-sentences-btn';
                        splitButton.innerHTML = '✂️'; // 使用剪刀图标
                        splitButton.title = '拆分句子并生成卡片'; // 鼠标悬停提示
                        splitButton.style.cssText = 'width: 24px; height: 24px; padding: 0; font-size: 16px; background-color: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;';
                        splitButton.addEventListener('click', () => {
                            // 获取当前配置
                            const asrTab = document.getElementById('asrTab');
                            let cardType, deckName, includePronunciation;
                            
                            // 辅助函数：获取输入值
                            const getInputValue = (id) => {
                                const el = document.getElementById(id);
                                return el ? el.value : '';
                            };
                            
                            // 辅助函数：获取复选框值
                            const getCheckboxValue = (id) => {
                                const el = document.getElementById(id);
                                return el ? el.checked : false;
                            };
                            
                            if (asrTab && asrTab.classList.contains('active')) {
                                // 在 ASR tab，使用 ASR tab 的配置
                                cardType = getInputValue('asrCardType');
                                deckName = getInputValue('asrDeckName');
                                includePronunciation = true; // ASR转写默认包含音频
                            } else {
                                // 在生成器 tab，使用生成器 tab 的配置
                                cardType = getInputValue('cardType');
                                deckName = getInputValue('deckName');
                                includePronunciation = getCheckboxValue('includePronunciation');
                            }
                            
                            if (!deckName || !deckName.trim()) {
                                if (typeof window.displayTemporaryMessage === 'function') {
                                    window.displayTemporaryMessage('请先选择目标牌组！', 'red', 3000);
                                } else {
                                    alert('请先选择目标牌组！');
                                }
                                return;
                            }
                            
                            // 确认操作
                            const frontContent = data.frontContent || '';
                            if (!confirm(`确定要将以下内容拆分成多个句子并生成卡片吗？\n\n${frontContent.substring(0, 100)}${frontContent.length > 100 ? '...' : ''}\n\n将添加到牌组: ${deckName}`)) {
                                return;
                            }
                            
                            // 调用后端拆分和生成功能
                            const args = [
                                frontContent,
                                cardType,
                                deckName,
                                includePronunciation
                            ];
                            if (typeof pycmd === 'function') {
                                pycmd(`split_and_generate_cards::${JSON.stringify(args)}`);
                            } else {
                                console.error('pycmd 函数不可用');
                            }
                        });
                        
                        // 将按钮添加到标题包装器中
                        titleWrapper.appendChild(splitButton);
                    }
                }
            }
        }
    }
    
    // 在渲染完成后添加拆分按钮（延迟一点确保DOM已更新）
    setTimeout(() => {
        addSplitButton();
    }, 150);
}

/**
 * 处理新生成的预览
 * @param {object} data - 从后端接收的预览数据
 */
function displayPreview(data) {
    // 根据当前激活的tab决定预览面板
    let previewPanel = document.getElementById('generatorPreviewPanel');
    const asrTab = document.getElementById('asrTab');
    const generatorTab = document.getElementById('generatorTab');
    
    // 检查哪个tab是激活的
    if (asrTab && asrTab.classList.contains('active')) {
        previewPanel = document.getElementById('asrPreviewPanel');
        console.log('[displayPreview] ASR tab激活，使用asrPreviewPanel');
    } else if (generatorTab && generatorTab.classList.contains('active')) {
        previewPanel = document.getElementById('generatorPreviewPanel');
        console.log('[displayPreview] 生成器tab激活，使用generatorPreviewPanel');
    }
    
    if (!previewPanel) {
        previewPanel = document.getElementById('generatorPreviewPanel');
        console.warn('[displayPreview] 未找到预览面板，使用默认的generatorPreviewPanel');
    }
    
    console.log('[displayPreview] 使用的预览面板:', previewPanel ? previewPanel.id : '未找到');
    
    if (data && data.success) {
        // 1. 添加到会话历史
        data.historyId = 'history-' + Date.now();
        
        // 根据当前激活的tab添加到对应的历史列表
        if (previewPanel) {
            if (previewPanel.id === 'generatorPreviewPanel') {
                // 生成器tab：添加到生成器的历史列表
                if (!window.generatorHistory) window.generatorHistory = [];
                window.generatorHistory.unshift(data);
                // 限制最多50条
                if (window.generatorHistory.length > 50) {
                    window.generatorHistory = window.generatorHistory.slice(0, 50);
                }
        if (typeof updateHistoryList === 'function') {
            updateHistoryList();
                }
                if (typeof saveSessionHistory === 'function') {
                    saveSessionHistory('generator');
                }
            } else if (previewPanel.id === 'asrPreviewPanel') {
                // ASR tab：添加到ASR的历史列表
                if (!window.asrHistory) window.asrHistory = [];
                window.asrHistory.unshift(data);
                // 限制最多50条
                if (window.asrHistory.length > 50) {
                    window.asrHistory = window.asrHistory.slice(0, 50);
                }
                if (typeof updateAsrHistoryList === 'function') {
                    updateAsrHistoryList();
                }
                if (typeof saveSessionHistory === 'function') {
                    saveSessionHistory('asr');
                }
            }
        }

        // 2. 渲染预览
        if (previewPanel) {
            console.log('[displayPreview] 开始渲染到面板:', previewPanel.id);
            renderCardPreview(previewPanel, data);
        } else {
            console.error('[displayPreview] 预览面板不存在！');
        }

        // 3. 在会话历史中高亮最新项
        if (previewPanel) {
            if (previewPanel.id === 'generatorPreviewPanel') {
                // 生成器tab：高亮生成器历史列表的第一项
        const firstHistoryItem = document.querySelector('#historyList li:first-child');
        if (firstHistoryItem && typeof selectHistoryItem === 'function') {
           selectHistoryItem(firstHistoryItem);
                }
            } else if (previewPanel.id === 'asrPreviewPanel') {
                // ASR tab：高亮ASR历史列表的第一项
                const firstHistoryItem = document.querySelector('#asrHistoryList li:first-child');
                if (firstHistoryItem && typeof selectAsrHistoryItem === 'function') {
                   selectAsrHistoryItem(firstHistoryItem);
                }
            }
        }
    } else {
        // 显示错误信息到对应的预览面板
        if (previewPanel) {
            previewPanel.innerHTML = '<div class="preview-placeholder"><p>生成失败，请查看日志</p></div>';
        } else {
            const defaultPanel = document.getElementById('generatorPreviewPanel');
            if (defaultPanel) {
                defaultPanel.innerHTML = '<div class="preview-placeholder"><p>生成失败，请查看日志</p></div>';
            }
        }
        if (typeof window.displayTemporaryMessage === 'function') {
            window.displayTemporaryMessage(data.error || '生成预览失败，未知错误。', 'red', 5000);
        }
    }
}

/**
 * 初始化音频控制按钮（循环播放和播放速度）
 * @param {HTMLElement} audioContainer - 音频容器元素
 * @param {HTMLAudioElement} audioPlayer - 音频播放器元素
 */
function initAudioControls(audioContainer, audioPlayer) {
    if (!audioContainer || !audioPlayer) {
        return;
    }
    
    // 找到标题 strong 标签
    const titleStrong = audioContainer.querySelector('strong');
    if (!titleStrong) {
        return;
    }
    
    // 检查是否已经添加过控制按钮，避免重复添加
    if (audioContainer.querySelector('.audio-controls-wrapper')) {
        return;
    }
    
    // 创建标题包装器，将标题和控制按钮放在同一行
    let titleWrapper = titleStrong.parentElement;
    if (!titleWrapper.classList.contains('audio-title-wrapper')) {
        titleWrapper = document.createElement('div');
        titleWrapper.className = 'audio-title-wrapper';
        titleWrapper.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';
        titleStrong.parentNode.insertBefore(titleWrapper, titleStrong);
        titleWrapper.appendChild(titleStrong);
    }
    
    // 创建控制按钮容器
    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'audio-controls-wrapper';
    controlsWrapper.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-left: auto;';
    
    // 循环播放按钮
    const loopButton = document.createElement('button');
    loopButton.className = 'audio-control-btn loop-btn';
    loopButton.innerHTML = '🔁';
    loopButton.title = '循环播放';
    loopButton.style.cssText = 'width: 24px; height: 24px; padding: 0; font-size: 16px; background-color: #555; color: white; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;';
    
    // 循环播放状态
    let isLooping = false;
    loopButton.addEventListener('click', () => {
        isLooping = !isLooping;
        audioPlayer.loop = isLooping;
        loopButton.style.backgroundColor = isLooping ? '#00aaff' : '#555';
        loopButton.title = isLooping ? '取消循环播放' : '循环播放';
    });
    
    // 播放速度控制下拉菜单
    const speedSelect = document.createElement('select');
    speedSelect.className = 'audio-speed-select';
    speedSelect.title = '播放速度';
    speedSelect.style.cssText = 'padding: 4px 8px; font-size: 0.85em; background-color: #555; color: white; border: 1px solid #777; border-radius: 4px; cursor: pointer; height: 24px;';
    
    // 播放速度选项
    const speeds = [
        { value: 0.5, label: '0.5x' },
        { value: 0.75, label: '0.75x' },
        { value: 1.0, label: '1.0x' },
        { value: 1.25, label: '1.25x' },
        { value: 1.5, label: '1.5x' },
        { value: 2.0, label: '2.0x' }
    ];
    
    speeds.forEach(speed => {
        const option = document.createElement('option');
        option.value = speed.value;
        option.textContent = speed.label;
        if (speed.value === 1.0) {
            option.selected = true;
        }
        speedSelect.appendChild(option);
    });
    
    // 监听播放速度变化
    speedSelect.addEventListener('change', () => {
        const speed = parseFloat(speedSelect.value);
        audioPlayer.playbackRate = speed;
    });
    
    // 将控制按钮添加到容器
    controlsWrapper.appendChild(loopButton);
    controlsWrapper.appendChild(speedSelect);
    titleWrapper.appendChild(controlsWrapper);
    
    // 监听音频播放结束，实现循环播放
    audioPlayer.addEventListener('ended', () => {
        if (isLooping) {
            audioPlayer.currentTime = 0;
            audioPlayer.play().catch(e => {
                console.warn('[音频控制] 循环播放失败:', e);
            });
        }
    });
}

// 将函数添加到全局作用域，供其他脚本使用
if (typeof window !== 'undefined') {
    window.initAudioControls = initAudioControls;
}

