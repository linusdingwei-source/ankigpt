// anki-gpt-addon/webview_script.js (Fully Upgraded Final Version)
'use strict';

// --- 全局变量 ---
let ankiGptConfig = {};   // 保存从Python收到的完整配置
let sessionHistory = [];  // 保存本次会话中生成的所有卡片预览数据

// --- 辅助函数 ---
function getInputValue(id) { return document.getElementById(id).value; }
function getCheckboxValue(id) { return document.getElementById(id).checked; }

/**
 * 去除文本中被括号包含的部分（支持全角和半角括号）
 * @param {string} text - 输入文本
 * @returns {string} - 处理后的文本
 */
function removeParenthesesContent(text) {
    if (!text) return text;
    // 匹配全角括号（（））和半角括号（()）及其内容
    return text.replace(/[（(][^）)]*[）)]/g, '');
}

/**
 * 智能处理输入文本：在遇到句号时自动去除括号内容
 * @param {string} text - 输入文本
 * @param {number} cursorPosition - 当前光标位置
 * @param {string} lastChar - 最后输入的字符（用于检测是否输入了句号）
 * @returns {object} - {processedText: string, newCursorPosition: number, shouldProcess: boolean}
 */
function processInputText(text, cursorPosition, lastChar) {
    if (!text) return { processedText: text, newCursorPosition: cursorPosition, shouldProcess: false };
    
    // 检测是否刚刚输入了句号（。！？）
    const isSentenceEnd = /[。！？]/.test(lastChar);
    
    if (!isSentenceEnd) {
        // 没有输入句号，不处理，保持原样
        return { processedText: text, newCursorPosition: cursorPosition, shouldProcess: false };
    }
    
    // 输入了句号，查找最后一个句号的位置
    const sentenceEndRegex = /[。！？]/g;
    let lastSentenceEnd = -1;
    let match;
    
    // 找到最后一个句号的位置
    while ((match = sentenceEndRegex.exec(text)) !== null) {
        lastSentenceEnd = match.index + 1; // 句号之后的位置
    }
    
    if (lastSentenceEnd === -1) {
        // 理论上不应该到这里，但为了安全起见
        return { processedText: text, newCursorPosition: cursorPosition, shouldProcess: false };
    }
    
    // 处理句号之前的内容
    const beforeSentenceEnd = text.substring(0, lastSentenceEnd);
    const afterSentenceEnd = text.substring(lastSentenceEnd);
    
    const processedBefore = removeParenthesesContent(beforeSentenceEnd);
    const processedText = processedBefore + afterSentenceEnd;
    
    // 计算光标位置的变化
    const lengthDiff = processedBefore.length - beforeSentenceEnd.length;
    const newCursorPosition = Math.max(0, cursorPosition + lengthDiff);
    
    return {
        processedText: processedText,
        newCursorPosition: newCursorPosition,
        shouldProcess: true
    };
}

// --- Python 可调用的全局函数 ---

/**
 * 页面加载完成后的主入口函数, 由 Python 调用
 */
window.initializeUI = function(config, decks, noteTypes) {
    console.log("Initializing UI with config:", config);
    ankiGptConfig = config;
    populateDynamicLists(decks, noteTypes);
    loadConfigIntoForms(config);
    // 额外调用，填充牌组浏览器
    if (window.populateDeckBrowser) {
        window.populateDeckBrowser(decks);
    }
};

window.setLoading = function(isLoading, message = '正在处理...') {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.textContent = message;
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
    // 禁用所有交互控件
    const controls = document.querySelectorAll('button, input, select, textarea');
    controls.forEach(el => el.disabled = isLoading);
};

window.displayTemporaryMessage = function(message, color, duration) {
    const statusLabel = document.getElementById('statusLabel');
    if (statusLabel) {
        statusLabel.textContent = message;
        statusLabel.className = 'status-message';
        if (color && color !== 'transparent') statusLabel.classList.add(`status-${color}`);
        setTimeout(() => {
            statusLabel.textContent = "";
            statusLabel.classList.remove(`status-${color}`);
        }, duration);
    }
};

window.displayPreviewFromBase64 = function(base64String) {
    try {
        const decodedJson = atob(base64String);
        const data = JSON.parse(decodeURIComponent(escape(decodedJson)));
        displayPreview(data);
    } catch (e) {
        console.error('Failed to decode or parse preview data from Base64:', e);
        displayTemporaryMessage('解析预览数据失败，请检查日志。', 'red', 5000);
    }
};

window.clearAfterSuccess = function() {
    document.getElementById('inputText').value = '';
    const generatorPreviewPanel = document.getElementById('generatorPreviewPanel');
    if (generatorPreviewPanel) {
        generatorPreviewPanel.innerHTML = '<div class="preview-placeholder"><p>生成的内容将在此处预览</p></div>';
    }
};


// --- 核心逻辑与UI渲染 ---

/**
 * [重构] 统一的卡片预览渲染函数
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
            ${!isExistingCard ? '<button class="styled-button add-to-anki-btn">添加到 Anki</button>' : `<button class="styled-button" disabled title="此卡片已存在于Anki中，NID: ${data.nid}">已在Anki中</button>`}
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
    
    if (data.audioBase64) {
        const audioContainer = container.querySelector('.preview-audio-container');
        const audioPlayer = container.querySelector('.preview-audio');
        if (audioContainer && audioPlayer) {
            audioContainer.style.display = 'block';
            audioPlayer.src = data.audioBase64;
            console.log('[renderCardPreview] 音频已设置');
            
            // 为音频控件添加preload属性，确保音频可以预加载
            audioPlayer.setAttribute('preload', 'auto');
            
            // 初始化音频控制按钮（循环播放和播放速度）
            if (typeof initAudioControls === 'function') {
                initAudioControls(audioContainer, audioPlayer);
            } else if (typeof window.initAudioControls === 'function') {
                window.initAudioControls(audioContainer, audioPlayer);
            }
            
            // 监听音频加载错误（仅记录错误，不记录成功）
            audioPlayer.addEventListener('error', (e) => {
                console.error('[音频] 加载错误:', e);
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
                        handleFullscreenKeyboard(e);
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
    console.log('[renderCardPreview] 交互式播放器启用:', ankiGptConfig ? ankiGptConfig.interactive_player_enabled : '配置未加载');
    
    if (data.timestamps && data.timestamps.length > 0 && ankiGptConfig && ankiGptConfig.interactive_player_enabled) {
        console.log('[renderCardPreview] 使用交互式句子渲染');
        if (interactiveContainer) {
            interactiveContainer.style.display = 'block';
            renderInteractiveSentence(interactiveContainer, data.timestamps, container);
            // 延迟一点绑定事件，确保DOM已完全更新
            setTimeout(() => {
                attachAudioEventListeners(container);
            }, 50);
        } else {
            console.error('[renderCardPreview] 交互式容器不存在！');
        }
        if (plainFrontContainer) {
            plainFrontContainer.style.display = 'none';
        }
    } else {
        console.log('[renderCardPreview] 使用普通文本渲染');
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
    
    // 检查容器是否可见
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
        console.log('  - container rect:', container.getBoundingClientRect());
        console.log('  - parent rect:', container.parentElement.getBoundingClientRect());
        
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
            setLoading(true, '正在添加到 Anki...');
            const args = [
                data.frontContent,
                data.backContent,
                data.audioFilename,
                getInputValue('cardType'),
                getInputValue('deckName'),
                getCheckboxValue('includePronunciation'),
                data.timestamps
            ];
            pycmd(`add_to_anki::${JSON.stringify(args)}`);
        });
    }
}


/**
 * [重构] 处理新生成的预览
 * @param {object} data - 从后端接收的预览数据
 */
function displayPreview(data) {
    const generatorPreviewPanel = document.getElementById('generatorPreviewPanel');
    if (data && data.success) {
        // 1. 添加到会话历史
        data.historyId = 'history-' + Date.now();
        sessionHistory.unshift(data);
        updateHistoryList();

        // 2. 渲染预览
        renderCardPreview(generatorPreviewPanel, data);

        // 3. 在会话历史中高亮最新项
        const firstHistoryItem = document.querySelector('#historyList li:first-child');
        if (firstHistoryItem) {
           selectHistoryItem(firstHistoryItem);
        }
    } else {
        generatorPreviewPanel.innerHTML = '<div class="preview-placeholder"><p>生成失败，请查看日志</p></div>';
        displayTemporaryMessage(data.error || '生成预览失败，未知错误。', 'red', 5000);
    }
}


// --- “会话历史” Tab 相关函数 ---
function updateHistoryList() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if (sessionHistory.length === 0) {
        list.innerHTML = '<li class="placeholder">暂无历史记录</li>';
        return;
    }
    sessionHistory.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.frontContent.substring(0, 30) + (item.frontContent.length > 30 ? '...' : '');
        li.dataset.historyId = item.historyId;
        list.appendChild(li);
    });
}

function selectHistoryItem(selectedLi) {
    document.querySelectorAll('#historyList li').forEach(item => item.classList.remove('selected'));
    selectedLi.classList.add('selected');
    const historyId = selectedLi.dataset.historyId;
    const cardData = sessionHistory.find(item => item.historyId === historyId);
    if (cardData) {
        // 使用生成器tab的预览面板（合并后的预览区）
        const previewPanel = document.getElementById('generatorPreviewPanel');
        renderCardPreview(previewPanel, cardData);
    }
}


// --- “牌组浏览” Tab 相关函数 ---
let deckCardList = []; // 保存当前牌组的卡片列表
let currentCardIndex = -1; // 当前卡片索引
let isFullscreenMode = false; // 全屏模式状态
let fullscreenAutoPlay = true; // 全屏模式下切换卡片时自动播放音频

window.populateDeckBrowser = function(decks) {
    const select = document.getElementById('deckBrowserSelect');
    select.innerHTML = '<option value="">-- 请选择一个牌组 --</option>';
    decks.forEach(deckName => {
        select.appendChild(new Option(deckName, deckName));
    });
};

window.populateDeckCardList = function(cards) {
    deckCardList = cards; // 保存卡片列表
    currentCardIndex = -1; // 重置索引
    const list = document.getElementById('deckCardList');
    list.innerHTML = '';
    if (cards.length === 0) {
        list.innerHTML = '<li class="placeholder">此牌组中没有卡片</li>';
        return;
    }
    cards.forEach((card, index) => {
        const li = document.createElement('li');
        li.textContent = card.front.substring(0, 30) + (card.front.length > 30 ? '...' : '');
        li.dataset.nid = card.nid;
        li.dataset.index = index;
        list.appendChild(li);
    });
};

window.displayDeckCardDetails = function(cardData) {
    console.log('[displayDeckCardDetails] 收到卡片数据:', cardData ? '有数据' : '无数据');
    console.log('[displayDeckCardDetails] 全屏模式状态:', isFullscreenMode);
    
    const previewPanel = document.getElementById('deckCardPreview');
    const loadingPlaceholder = previewPanel.querySelector('.preview-placeholder.loading');
    if(loadingPlaceholder) {
        loadingPlaceholder.remove();
    }
    renderCardPreview(previewPanel, cardData);
    
    // 如果处于全屏模式，也更新全屏预览
    if (isFullscreenMode) {
        console.log('[displayDeckCardDetails] 全屏模式，更新全屏预览');
        const fullscreenPreview = document.getElementById('fullscreenPreview');
        if (fullscreenPreview) {
            console.log('[displayDeckCardDetails] 找到全屏预览容器，开始渲染');
            renderCardPreview(fullscreenPreview, cardData);
            updateFullscreenCounter();
            
            // 检查是否需要自动播放
            const shouldAutoPlay = fullscreenPreview.dataset.autoPlay === 'true' && fullscreenAutoPlay;
            if (shouldAutoPlay) {
                console.log('[displayDeckCardDetails] 准备自动播放音频');
                // 等待音频元素加载完成后再播放
                const audioPlayer = fullscreenPreview.querySelector('.preview-audio');
                if (audioPlayer) {
                    console.log('[displayDeckCardDetails] 找到音频播放器，src:', audioPlayer.src ? '有' : '无', 'readyState:', audioPlayer.readyState);
                    
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
                            console.log('[displayDeckCardDetails] 已经播放过，跳过');
                            cleanup();
                            return;
                        }
                        
                        if (audioPlayer.src && audioPlayer.readyState >= 2) {
                            console.log('[displayDeckCardDetails] 音频已加载，开始自动播放，readyState:', audioPlayer.readyState);
                            hasPlayed = true; // 标记为已播放
                            cleanup(); // 立即清理事件监听器和超时
                            
                            audioPlayer.currentTime = 0;
                            // 直接尝试播放，因为这是用户交互（按空格键）触发的
                            const playPromise = audioPlayer.play();
                            if (playPromise !== undefined) {
                                playPromise
                                    .then(() => {
                                        console.log('[displayDeckCardDetails] 自动播放成功');
                                    })
                                    .catch(e => {
                                        console.warn('[displayDeckCardDetails] 自动播放失败:', e.name, e.message);
                                        hasPlayed = false; // 播放失败，重置标志
                                        // 如果自动播放失败，尝试使用safePlayAudio
                                        safePlayAudio(audioPlayer);
                                    });
                            }
                        }
                    };
                    
                    // 如果已经加载完成，直接播放
                    if (audioPlayer.readyState >= 2) {
                        console.log('[displayDeckCardDetails] 音频已就绪，立即播放');
                        hasPlayed = true; // 标记为已播放
                        setTimeout(() => {
                            if (!hasPlayed) return; // 双重检查
                            audioPlayer.currentTime = 0;
                            const playPromise = audioPlayer.play();
                            if (playPromise !== undefined) {
                                playPromise
                                    .then(() => {
                                        console.log('[displayDeckCardDetails] 自动播放成功（立即）');
                                    })
                                    .catch(e => {
                                        console.warn('[displayDeckCardDetails] 自动播放失败（立即）:', e.name, e.message);
                                        hasPlayed = false; // 播放失败，重置标志
                                        safePlayAudio(audioPlayer);
                                    });
                            }
                        }, 50);
                    } else {
                        console.log('[displayDeckCardDetails] 等待音频加载，当前readyState:', audioPlayer.readyState);
                        // 等待加载完成
                        audioPlayer.addEventListener('canplay', tryAutoPlay);
                        audioPlayer.addEventListener('loadeddata', tryAutoPlay);
                        audioPlayer.addEventListener('canplaythrough', tryAutoPlay);
                        // 设置超时，避免无限等待
                        timeoutId = setTimeout(() => {
                            if (!hasPlayed && audioPlayer.src && audioPlayer.readyState >= 1) {
                                console.log('[displayDeckCardDetails] 音频加载超时，尝试强制播放');
                                tryAutoPlay();
                            } else {
                                cleanup();
                            }
                        }, 2000);
                    }
                } else {
                    console.warn('[displayDeckCardDetails] 未找到音频播放器');
                }
            }
            // 清除自动播放标志
            fullscreenPreview.dataset.autoPlay = 'false';
        } else {
            console.error('[displayDeckCardDetails] 未找到全屏预览容器！');
        }
    }
};


// --- 交互式播放器相关函数 (已重构) ---
function renderInteractiveSentence(container, timestamps, parentContainer) {
    console.log('[renderInteractiveSentence] 开始渲染，容器:', container ? container.id || container.className : '未知', '时间戳数量:', timestamps.length);
    container.innerHTML = '';
    timestamps.forEach(word => {
        const span = document.createElement('span');
        span.textContent = word.text;
        span.className = 'interactive-word';
        span.dataset.startTime = word.begin_time;
        span.dataset.endTime = word.end_time;
        span.addEventListener('click', () => {
            console.log('[交互式单词点击] 单词:', word.text, '开始时间:', word.begin_time);
            const audioPlayer = parentContainer.querySelector('.preview-audio');
            if (audioPlayer && audioPlayer.src) {
                console.log('[交互式单词点击] 找到音频播放器，设置时间:', word.begin_time / 1000);
                audioPlayer.currentTime = word.begin_time / 1000;
                const playPromise = audioPlayer.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.warn('[交互式单词点击] 播放失败:', e.message);
                    });
                }
            } else {
                console.warn('[交互式单词点击] 音频播放器不存在或没有音频源');
            }
        });
        if (word.text === '\n') container.appendChild(document.createElement('br'));
        else container.appendChild(span);
    });
    console.log('[renderInteractiveSentence] 渲染完成，单词数量:', container.querySelectorAll('.interactive-word').length);
}

function attachAudioEventListeners(parentContainer) {
    console.log('[attachAudioEventListeners] 开始绑定事件，容器:', parentContainer ? parentContainer.id || parentContainer.className : '未知');
    const audioPlayer = parentContainer.querySelector('.preview-audio');
    const sentenceContainer = parentContainer.querySelector('.interactive-sentence');
    
    if (!audioPlayer) {
        console.warn('[attachAudioEventListeners] 未找到音频播放器');
        return;
    }
    if (!sentenceContainer) {
        console.warn('[attachAudioEventListeners] 未找到交互式句子容器');
        return;
    }
    
    console.log('[attachAudioEventListeners] 找到音频播放器和句子容器，开始绑定事件');
    
    const timeUpdateHandler = () => {
        const currentTimeMs = audioPlayer.currentTime * 1000;
        const words = sentenceContainer.querySelectorAll('.interactive-word');
        words.forEach(word => {
            const start = parseFloat(word.dataset.startTime);
            const end = parseFloat(word.dataset.endTime);
            word.classList.toggle('highlight', currentTimeMs >= start && currentTimeMs <= end);
        });
    };
    const endedHandler = () => {
        sentenceContainer.querySelectorAll('.interactive-word').forEach(word => word.classList.remove('highlight'));
    };
    
    // 先移除旧的事件监听器（如果存在）
    audioPlayer.removeEventListener('timeupdate', timeUpdateHandler);
    audioPlayer.removeEventListener('ended', endedHandler);
    
    // 添加新的事件监听器
    audioPlayer.addEventListener('timeupdate', timeUpdateHandler);
    audioPlayer.addEventListener('ended', endedHandler);
    
    console.log('[attachAudioEventListeners] 事件绑定完成');
}


// --- 设置和初始化 ---
function populateDynamicLists(decks, noteTypes) {
    // ... (代码与你提供的版本一致，保持不变) ...
    const deckList = document.getElementById('deckOptions');
    if (deckList) {
        deckList.innerHTML = '';
        decks.forEach(deck => deckList.appendChild(new Option(deck)));
    }
    const cardTypeSelects = [document.getElementById('cardType'), document.getElementById('settingsDefaultCardType')];
    cardTypeSelects.forEach(select => {
        if (select) {
            select.innerHTML = '';
            noteTypes.forEach(nt => select.appendChild(new Option(nt, nt)));
        }
    });
}

function loadConfigIntoForms(config) {
    // ... (代码与你提供的版本一致，保持不变) ...
    document.getElementById('cardType').value = config.default_card_type;
    document.getElementById('deckName').value = config.last_used_deck || config.default_deck_name;
    document.getElementById('includePronunciation').checked = config.interactive_player_enabled;
    document.getElementById('settingsApiKey').value = config.dashscope_api_key || '';
    document.getElementById('settingsDefaultCardType').value = config.default_card_type;
    document.getElementById('settingsDefaultDeckName').value = config.default_deck_name;
    document.getElementById('settingsInteractivePlayer').checked = config.interactive_player_enabled;
    document.getElementById('settingsTtsProvider').value = config.tts_provider;
    if (config.qwen_tts_options) {
        document.getElementById('settingsQwenModel').value = config.qwen_tts_options.model;
        document.getElementById('settingsQwenVoice').value = config.qwen_tts_options.voice;
        document.getElementById('settingsQwenLanguage').value = config.qwen_tts_options.language_type;
    }
    if (config.ssml_options) {
        document.getElementById('settingsSsmlEnabled').checked = config.ssml_options.enabled;
        document.getElementById('settingsSsmlRules').value = JSON.stringify(config.ssml_options.rules, null, 2);
    }
}

function collectSettingsData() {
    // ... (代码与你提供的版本一致，保持不变) ...
    const newConfig = { ...ankiGptConfig };
    newConfig.dashscope_api_key = getInputValue('settingsApiKey');
    newConfig.default_card_type = getInputValue('settingsDefaultCardType');
    newConfig.default_deck_name = getInputValue('settingsDefaultDeckName');
    newConfig.interactive_player_enabled = getCheckboxValue('settingsInteractivePlayer');
    newConfig.tts_provider = getInputValue('settingsTtsProvider');
    if (!newConfig.qwen_tts_options) newConfig.qwen_tts_options = {};
    newConfig.qwen_tts_options.model = getInputValue('settingsQwenModel');
    newConfig.qwen_tts_options.voice = getInputValue('settingsQwenVoice');
    newConfig.qwen_tts_options.language_type = getInputValue('settingsQwenLanguage');
    if (!newConfig.ssml_options) newConfig.ssml_options = {};
    newConfig.ssml_options.enabled = getCheckboxValue('settingsSsmlEnabled');
    try {
        newConfig.ssml_options.rules = JSON.parse(getInputValue('settingsSsmlRules'));
    } catch (e) {
        displayTemporaryMessage('SSML 规则 JSON 格式错误，该项未保存！', 'red', 5000);
        newConfig.ssml_options.rules = ankiGptConfig.ssml_options.rules;
    }
    return newConfig;
}


/**
 * 集中设置所有事件监听器
 */
function setupEventListeners() {
    // Tab切换
    document.querySelector('.tab-bar').addEventListener('click', (event) => {
        if (event.target.matches('.tab-button')) {
            const tabId = event.target.dataset.tab;
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        }
    });

    // 生成器
    document.getElementById('generateButton').addEventListener('click', () => {
        let inputText = getInputValue('inputText');
        if (!inputText.trim()) return displayTemporaryMessage("请输入日文句子！", "red", 3000);
        // 去除括号内的内容（如：働（はたら）き → 働き）
        inputText = removeParenthesesContent(inputText);
        pycmd(`generate_preview::${JSON.stringify([inputText])}`);
    });
    
    // 日文输入框：自动处理括号内容（在遇到句号时）
    const inputTextElement = document.getElementById('inputText');
    if (inputTextElement) {
        let lastValue = inputTextElement.value;
        
        // 监听输入事件，实时处理括号内容
        inputTextElement.addEventListener('input', (event) => {
            const originalValue = event.target.value;
            const cursorPosition = event.target.selectionStart;
            
            // 检测是否输入了句号：检查光标位置之前的字符是否是句号
            let lastChar = '';
            if (originalValue.length > lastValue.length && cursorPosition > 0) {
                lastChar = originalValue.charAt(cursorPosition - 1);
            }
            
            // 处理括号内容（仅在遇到句号时自动处理）
            const processed = processInputText(originalValue, cursorPosition, lastChar);
            const newValue = processed.shouldProcess ? processed.processedText : originalValue;
            const newCursorPosition = processed.shouldProcess 
                ? processed.newCursorPosition 
                : cursorPosition;
            
            if (originalValue !== newValue) {
                event.target.value = newValue;
                // 恢复光标位置
                event.target.setSelectionRange(newCursorPosition, newCursorPosition);
            }
            
            // 更新最后的值
            lastValue = newValue;
        });
        
        // 监听失去焦点事件，输入完成时处理所有括号内容
        inputTextElement.addEventListener('blur', (event) => {
            const originalValue = event.target.value;
            if (!originalValue) return;
            
            // 处理所有括号内容
            const processedText = removeParenthesesContent(originalValue);
            if (originalValue !== processedText) {
                event.target.value = processedText;
            }
            lastValue = processedText;
        });
        
        // 监听粘贴事件，处理括号内容
        inputTextElement.addEventListener('paste', (event) => {
            event.preventDefault();
            const pastedText = (event.clipboardData || window.clipboardData).getData('text');
            
            // 处理括号内容
            const cleanedText = removeParenthesesContent(pastedText);
            
            // 获取当前光标位置
            const start = event.target.selectionStart;
            const end = event.target.selectionEnd;
            const currentValue = event.target.value;
            
            // 插入清理后的文本
            const newValue = currentValue.substring(0, start) + cleanedText + currentValue.substring(end);
            event.target.value = newValue;
            
            // 设置光标位置到插入文本的末尾
            const newCursorPosition = start + cleanedText.length;
            event.target.setSelectionRange(newCursorPosition, newCursorPosition);
        });
    }
    
    document.getElementById('inputText').addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            document.getElementById('generateButton').click();
        }
    });

    // 设置
    document.getElementById('saveSettingsButton').addEventListener('click', () => {
        pycmd(`save_config::${JSON.stringify(collectSettingsData())}`);
    });

    // 会话历史 (事件委托)
    document.getElementById('historyList').addEventListener('click', (event) => {
        const li = event.target.closest('li');
        if (li && li.dataset.historyId) {
            selectHistoryItem(li);
        }
    });

    // 牌组浏览 (事件委托和change)
    document.getElementById('deckBrowserSelect').addEventListener('change', (event) => {
        const deckName = event.target.value;
        const listEl = document.getElementById('deckCardList');
        const previewEl = document.getElementById('deckCardPreview');
        document.getElementById('deckCardListHeader').textContent = deckName ? `牌组 "${deckName}"` : '请先选择一个牌组';
        previewEl.innerHTML = '<div class="preview-placeholder"><p>请在左侧选择一张卡片进行预览</p></div>';
        if (deckName) {
            listEl.innerHTML = '<li class="placeholder">正在加载卡片列表...</li>';
            pycmd(`fetch_deck_cards::["${deckName}"]`);
        } else {
            listEl.innerHTML = '<li class="placeholder">...</li>';
        }
    });
    document.getElementById('deckCardList').addEventListener('click', (event) => {
        const li = event.target.closest('li');
        if (li && li.dataset.nid) {
            document.querySelectorAll('#deckCardList li').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
            // 更新当前索引
            if (li.dataset.index !== undefined) {
                currentCardIndex = parseInt(li.dataset.index);
            }
            document.getElementById('deckCardPreview').innerHTML = '<div class="preview-placeholder loading"><p>正在加载卡片详情...</p></div>';
            pycmd(`fetch_card_details::[${parseInt(li.dataset.nid)}]`);
        }
    });
    // 双击左侧列表项自动播放音频
    let currentPlayObserver = null; // 保存当前的Observer，避免重复创建
    
    document.getElementById('deckCardList').addEventListener('dblclick', (event) => {
        const li = event.target.closest('li');
        if (!li || !li.dataset.nid) {
            return;
        }
        
        const nid = li.dataset.nid;
        const previewPanel = document.getElementById('deckCardPreview');
        
        if (!previewPanel) {
            return;
        }
        
        // 如果已有Observer在运行，先断开
        if (currentPlayObserver) {
            currentPlayObserver.disconnect();
            currentPlayObserver = null;
        }
        
        // 检查音频是否已加载
        const audioPlayer = previewPanel.querySelector('.preview-audio');
        const previewSection = previewPanel.querySelector('.preview-section-inner');
        
        // 辅助函数：安全播放音频
        const safePlayAudio = (audio) => {
            if (!audio || !audio.parentElement) {
                return; // 音频元素不在DOM中，不播放
            }
            
            // 检查音频是否有有效的src
            if (!audio.src || audio.src === window.location.href || audio.src === '') {
                return;
            }
            
            // 检查音频是否已加载
            if (audio.readyState < 2) { // HAVE_CURRENT_DATA
                // 等待音频加载完成
                const onLoadedData = () => {
                    if (audio.parentElement) { // 确保元素仍在DOM中
                        audio.play().catch(e => {
                            // 忽略"元素被移除"的错误，因为这是正常的（用户切换卡片时）
                            if (!e.message.includes('removed from the document')) {
                                console.warn('[双击播放] 播放失败:', e.message);
                            }
                        });
                    }
                    audio.removeEventListener('loadeddata', onLoadedData);
                };
                audio.addEventListener('loadeddata', onLoadedData);
            } else {
                // 音频已加载，直接播放
                audio.play().catch(e => {
                    // 忽略"元素被移除"的错误
                    if (!e.message.includes('removed from the document')) {
                        console.warn('[双击播放] 播放失败:', e.message);
                    }
                });
            }
        };
        
        if (previewSection && audioPlayer && audioPlayer.src) {
            // 卡片详情已加载，直接播放
            safePlayAudio(audioPlayer);
        } else if (!previewSection) {
            // 卡片详情未加载，先加载再播放
            document.querySelectorAll('#deckCardList li').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
            previewPanel.innerHTML = '<div class="preview-placeholder loading"><p>正在加载卡片详情...</p></div>';
            pycmd(`fetch_card_details::[${parseInt(nid)}]`);
            
            // 等待加载完成后播放
            let attempts = 0;
            const maxAttempts = 50;
            
            currentPlayObserver = new MutationObserver((mutations, obs) => {
                attempts++;
                const audio = previewPanel.querySelector('.preview-audio');
                
                if (audio && audio.src && audio.src !== window.location.href && audio.src !== '') {
                    // 等待一小段时间确保音频元素稳定
                    setTimeout(() => {
                        if (audio.parentElement) {
                            safePlayAudio(audio);
                            obs.disconnect();
                            currentPlayObserver = null;
                        }
                    }, 100);
                }
                
                if (attempts >= maxAttempts) {
                    obs.disconnect();
                    currentPlayObserver = null;
                }
            });
            
            currentPlayObserver.observe(previewPanel, { 
                childList: true, 
                subtree: true,
                attributes: true,
                attributeFilter: ['src']
            });
            
            // 设置超时
            setTimeout(() => {
                if (currentPlayObserver) {
                    currentPlayObserver.disconnect();
                    currentPlayObserver = null;
                }
            }, 5000);
        } else {
            // 卡片详情已加载但没有音频
            const audioContainer = previewPanel.querySelector('.preview-audio-container');
            if (!audioContainer || audioContainer.style.display === 'none') {
                // 不显示消息，静默处理
            }
        }
    });
    
    // 全屏模式切换
    const fullscreenToggleBtn = document.getElementById('fullscreenToggleBtn');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    if (fullscreenToggleBtn) {
        fullscreenToggleBtn.addEventListener('click', toggleFullscreen);
    }
    if (exitFullscreenBtn) {
        exitFullscreenBtn.addEventListener('click', exitFullscreen);
    }
    
    // 全屏模式下的键盘事件（使用捕获阶段，确保优先处理）
    document.addEventListener('keydown', handleFullscreenKeyboard, true);
    
    // 为音频控件添加键盘事件处理，确保焦点在音频控件上时也能响应快捷键
    document.addEventListener('keydown', (event) => {
        if (!isFullscreenMode) {
            return;
        }
        
        // 检查焦点是否在音频控件上
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'AUDIO') {
            // 处理全屏模式的快捷键
            const key = event.key;
            const keyCode = event.keyCode;
            
            // 这些键不应该被音频控件处理，应该由我们的全屏键盘处理器处理
            if (key === ' ' || keyCode === 32 || // 空格
                key === 'ArrowLeft' || keyCode === 37 || // 左箭头
                key === 'ArrowRight' || keyCode === 39 || // 右箭头
                key === 'ArrowUp' || keyCode === 38 || // 上箭头
                key === 'ArrowDown' || keyCode === 40 || // 下箭头
                key === 'Enter' || keyCode === 13 || // Enter
                key === 'Tab' || keyCode === 9 || // Tab
                key === 'Escape' || keyCode === 27) { // ESC
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                // 调用全屏键盘处理器
                handleFullscreenKeyboard(event);
                return false;
            }
        }
    }, true); // 使用捕获阶段，确保优先处理
    
    // 全屏模式下双击卡片内容播放音频
    document.addEventListener('dblclick', (event) => {
        if (!isFullscreenMode) {
            return;
        }
        
        // 检查是否点击在全屏预览区域内
        const fullscreenPreview = document.getElementById('fullscreenPreview');
        if (fullscreenPreview && fullscreenPreview.contains(event.target)) {
            // 如果点击的不是按钮或链接，则播放音频
            if (event.target.tagName !== 'BUTTON' && event.target.tagName !== 'A' && !event.target.closest('button') && !event.target.closest('a')) {
                console.log('[全屏双击] 双击卡片内容，播放音频');
                playFullscreenAudio();
            }
        }
    });
}

// --- 全屏模式相关函数 ---
function toggleFullscreen() {
    if (isFullscreenMode) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

function enterFullscreen() {
    console.log('[enterFullscreen] 进入全屏模式');
    console.log('[enterFullscreen] 卡片列表长度:', deckCardList.length);
    
    if (deckCardList.length === 0) {
        console.warn('[enterFullscreen] 卡片列表为空');
        displayTemporaryMessage('请先选择一个牌组并加载卡片', 'orange', 3000);
        return;
    }
    
    // 找到当前选中的卡片
    const selectedLi = document.querySelector('#deckCardList li.selected');
    console.log('[enterFullscreen] 选中的列表项:', selectedLi);
    
    if (selectedLi && selectedLi.dataset.index !== undefined) {
        currentCardIndex = parseInt(selectedLi.dataset.index);
        console.log('[enterFullscreen] 使用选中卡片的索引:', currentCardIndex);
    } else if (deckCardList.length > 0) {
        currentCardIndex = 0;
        console.log('[enterFullscreen] 没有选中项，使用第一个卡片，索引:', currentCardIndex);
    } else {
        console.warn('[enterFullscreen] 没有可显示的卡片');
        displayTemporaryMessage('没有可显示的卡片', 'orange', 3000);
        return;
    }
    
    const fullscreenContainer = document.getElementById('fullscreenContainer');
    console.log('[enterFullscreen] 全屏容器:', fullscreenContainer);
    
    if (!fullscreenContainer) {
        console.error('[enterFullscreen] 全屏容器不存在！');
        return;
    }
    
    isFullscreenMode = true;
    document.body.classList.add('fullscreen-mode');
    
    // --- 核心修改 ---
    // 直接通过 style 控制显示，而不是依赖 CSS class
    fullscreenContainer.style.display = 'flex';
    // ----------------
    
    console.log('[enterFullscreen] 全屏模式已激活');
    console.log('[enterFullscreen] 全屏容器display:', fullscreenContainer.style.display);
    console.log('[enterFullscreen] 全屏容器computed display:', window.getComputedStyle(fullscreenContainer).display);
    
    // 加载当前卡片
    loadCardInFullscreen(currentCardIndex);
    updateFullscreenCounter();
}

function exitFullscreen() {
    console.log('[exitFullscreen] 退出全屏模式');
    isFullscreenMode = false;
    document.body.classList.remove('fullscreen-mode');
    const fullscreenContainer = document.getElementById('fullscreenContainer');
    if (fullscreenContainer) {
        // --- 核心修改 ---
        // 同样，直接通过 style 控制隐藏
        fullscreenContainer.style.display = 'none';
        // ----------------
        console.log('[exitFullscreen] 全屏容器已隐藏');
    }
}

function loadCardInFullscreen(index, autoPlay = false) {
    console.log('[loadCardInFullscreen] 加载卡片，索引:', index, '自动播放:', autoPlay);
    console.log('[loadCardInFullscreen] 卡片列表长度:', deckCardList.length);
    
    if (index < 0 || index >= deckCardList.length) {
        console.warn('[loadCardInFullscreen] 索引超出范围:', index);
        return;
    }
    
    currentCardIndex = index;
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
    updateFullscreenCounter();
}

function updateFullscreenCounter() {
    const counter = document.getElementById('fullscreenCardCounter');
    if (counter && deckCardList.length > 0 && currentCardIndex >= 0) {
        counter.textContent = `${currentCardIndex + 1} / ${deckCardList.length}`;
    }
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

/**
 * 播放全屏模式下的音频
 */
function playFullscreenAudio() {
    if (!isFullscreenMode) {
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
        safePlayAudio(audioPlayer);
    } else {
        console.warn('[playFullscreenAudio] 音频播放器不存在或没有音频源');
    }
}

/**
 * 切换全屏模式下的音频播放/暂停
 */
function toggleFullscreenAudio() {
    if (!isFullscreenMode) {
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
            safePlayAudio(audioPlayer);
        } else {
            console.log('[toggleFullscreenAudio] 暂停播放');
            audioPlayer.pause();
        }
    } else {
        console.warn('[toggleFullscreenAudio] 音频播放器不存在或没有音频源');
    }
}

function handleFullscreenKeyboard(event) {
    if (!isFullscreenMode) {
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
    
    // 空格键：下一个卡片 + 自动播放
    if (event.key === ' ' || event.keyCode === 32) {
        console.log('[handleFullscreenKeyboard] 空格键按下，切换到下一个卡片');
        event.preventDefault();
        event.stopPropagation();
        if (deckCardList.length > 0) {
            const nextIndex = (currentCardIndex + 1) % deckCardList.length;
            loadCardInFullscreen(nextIndex, true); // true表示自动播放
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
            loadCardInFullscreen(prevIndex, true); // true表示自动播放
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
            loadCardInFullscreen(nextIndex, true); // true表示自动播放
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

// DOM加载完成后，绑定所有事件
document.addEventListener('DOMContentLoaded', setupEventListeners);
