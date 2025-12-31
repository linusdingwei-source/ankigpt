// webview_main.js - 主入口和事件监听器模块

// --- 全局变量 ---
window.ankiGptConfig = {};   // 保存从Python收到的完整配置
window.sessionHistory = [];  // 保存本次会话中生成的所有卡片预览数据

// --- 辅助函数 ---
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
    window.ankiGptConfig = config;
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
        if (typeof displayPreview === 'function') {
            displayPreview(data);
        }
    } catch (e) {
        console.error('Failed to decode or parse preview data from Base64:', e);
        window.displayTemporaryMessage('解析预览数据失败，请检查日志。', 'red', 5000);
    }
};

window.clearAfterSuccess = function() {
    // 根据当前激活的tab清空对应的输入框和预览面板
    const generatorTab = document.getElementById('generatorTab');
    const asrTab = document.getElementById('asrTab');
    
    if (generatorTab && generatorTab.classList.contains('active')) {
        // 生成器tab：清空输入框和预览面板
        const inputText = document.getElementById('inputText');
        if (inputText) {
            inputText.value = '';
        }
    const generatorPreviewPanel = document.getElementById('generatorPreviewPanel');
    if (generatorPreviewPanel) {
        generatorPreviewPanel.innerHTML = '<div class="preview-placeholder"><p>生成的内容将在此处预览</p></div>';
    }
    } else if (asrTab && asrTab.classList.contains('active')) {
        // ASR tab：清空输入框和预览面板
        const asrAudioUrl = document.getElementById('asrAudioUrl');
        if (asrAudioUrl) {
            asrAudioUrl.value = '';
        }
        const asrPreviewPanel = document.getElementById('asrPreviewPanel');
        if (asrPreviewPanel) {
            asrPreviewPanel.innerHTML = '<div class="preview-placeholder"><p>转写结果将在此处预览</p></div>';
        }
    } else {
        // 如果无法确定当前tab，清空所有输入框和预览面板
        const inputText = document.getElementById('inputText');
        if (inputText) {
            inputText.value = '';
        }
        const asrAudioUrl = document.getElementById('asrAudioUrl');
        if (asrAudioUrl) {
            asrAudioUrl.value = '';
        }
        const generatorPreviewPanel = document.getElementById('generatorPreviewPanel');
        const asrPreviewPanel = document.getElementById('asrPreviewPanel');
        if (generatorPreviewPanel) {
            generatorPreviewPanel.innerHTML = '<div class="preview-placeholder"><p>生成的内容将在此处预览</p></div>';
        }
        if (asrPreviewPanel) {
            asrPreviewPanel.innerHTML = '<div class="preview-placeholder"><p>转写结果将在此处预览</p></div>';
        }
    }
};

/**
 * 初始化分隔条拖拽功能
 */
function setupResizers() {
    // 生成器tab的分隔条
    const resizerLeft = document.getElementById('resizerLeft');
    const resizerRight = document.getElementById('resizerRight');
    const leftPanel = document.querySelector('#generatorTab .left-panel');
    const middlePanel = document.querySelector('#generatorTab .middle-panel');
    const historyPanel = document.getElementById('historyPanel');
    
    // ASR tab的分隔条（虽然当前不使用，但为了布局一致性保留）
    const asrResizerLeft = document.getElementById('asrResizerLeft');
    const asrLeftPanel = document.querySelector('#asrTab .left-panel');
    const asrMiddlePanel = document.querySelector('#asrTab .middle-panel');
    
    let isResizingLeft = false;
    let isResizingRight = false;
    
    // 生成器tab的左侧分隔条
    if (resizerLeft && leftPanel && middlePanel) {
        resizerLeft.addEventListener('mousedown', (e) => {
            isResizingLeft = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
    }
    
    // 生成器tab的右侧分隔条
    if (resizerRight && middlePanel && historyPanel) {
        resizerRight.addEventListener('mousedown', (e) => {
            isResizingRight = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
    }
    
    // ASR tab的左侧分隔条
    if (asrResizerLeft && asrLeftPanel && asrMiddlePanel) {
        asrResizerLeft.addEventListener('mousedown', (e) => {
            isResizingLeft = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
    }
    
    // ASR tab的右侧分隔条
    const asrResizerRight = document.getElementById('asrResizerRight');
    const asrHistoryPanel = document.getElementById('asrHistoryPanel');
    if (asrResizerRight && asrMiddlePanel && asrHistoryPanel) {
        asrResizerRight.addEventListener('mousedown', (e) => {
            isResizingRight = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
    }
    
    // 鼠标移动事件
    document.addEventListener('mousemove', (e) => {
        if (isResizingLeft) {
            // 判断是生成器tab还是ASR tab
            const currentLeftPanel = document.querySelector('#generatorTab.active .left-panel') || 
                                     document.querySelector('#asrTab.active .left-panel');
            const currentMiddlePanel = document.querySelector('#generatorTab.active .middle-panel') || 
                                       document.querySelector('#asrTab.active .middle-panel');
            
            if (currentLeftPanel && currentMiddlePanel) {
                const container = currentLeftPanel.parentElement;
                const containerRect = container.getBoundingClientRect();
                const newLeftWidth = e.clientX - containerRect.left;
                const minWidth = 250;
                const maxWidth = 600;
                if (newLeftWidth >= minWidth && newLeftWidth <= maxWidth) {
                    currentLeftPanel.style.flex = `0 0 ${newLeftWidth}px`;
                }
            }
        } else if (isResizingRight) {
            // 判断是生成器tab还是ASR tab
            const currentHistoryPanel = document.querySelector('#generatorTab.active .history-panel') ||
                                        document.querySelector('#asrTab.active .history-panel');
            
            if (currentHistoryPanel) {
                const container = currentHistoryPanel.parentElement;
                const containerRect = container.getBoundingClientRect();
                const newRightWidth = containerRect.right - e.clientX;
                const minWidth = 200;
                const maxWidth = 500;
                if (newRightWidth >= minWidth && newRightWidth <= maxWidth) {
                    currentHistoryPanel.style.flex = `0 0 ${newRightWidth}px`;
                }
            }
        }
    });
    
    // 鼠标释放事件
    document.addEventListener('mouseup', () => {
        if (isResizingLeft || isResizingRight) {
            isResizingLeft = false;
            isResizingRight = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

/**
 * 初始化牌组卡片面板功能
 */
function setupDeckCardsPanel() {
    // 生成器tab的牌组卡片面板
    const refreshBtn = document.getElementById('refreshDeckCardsBtn');
    const deckNameInput = document.getElementById('deckName');
    const deckCardsList = document.getElementById('deckCardsList');
    
    // 刷新按钮
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const deckName = deckNameInput ? deckNameInput.value.trim() : '';
            if (deckName) {
                loadDeckCards('generator', deckName);
            } else {
                deckCardsList.innerHTML = '<li class="placeholder">请先选择目标牌组</li>';
            }
        });
    }
    
    // 监听牌组选择变化
    if (deckNameInput) {
        deckNameInput.addEventListener('change', () => {
            const deckName = deckNameInput.value.trim();
            if (deckName) {
                loadDeckCards('generator', deckName);
            } else {
                deckCardsList.innerHTML = '<li class="placeholder">请先选择目标牌组</li>';
            }
        });
    }
    
    // ASR tab的牌组卡片面板
    const asrRefreshBtn = document.getElementById('asrRefreshDeckCardsBtn');
    const asrDeckNameInput = document.getElementById('asrDeckName');
    const asrDeckCardsList = document.getElementById('asrDeckCardsList');
    
    // 刷新按钮
    if (asrRefreshBtn) {
        asrRefreshBtn.addEventListener('click', () => {
            const deckName = asrDeckNameInput ? asrDeckNameInput.value.trim() : '';
            if (deckName) {
                loadDeckCards('asr', deckName);
            } else {
                asrDeckCardsList.innerHTML = '<li class="placeholder">请先选择目标牌组</li>';
            }
        });
    }
    
    // 监听牌组选择变化
    if (asrDeckNameInput) {
        asrDeckNameInput.addEventListener('change', () => {
            const deckName = asrDeckNameInput.value.trim();
            if (deckName) {
                loadDeckCards('asr', deckName);
            } else {
                asrDeckCardsList.innerHTML = '<li class="placeholder">请先选择目标牌组</li>';
            }
        });
    }
}

/**
 * 加载牌组卡片列表
 */
function loadDeckCards(tabType, deckName) {
    if (!deckName) {
        return;
    }
    
    const listId = tabType === 'generator' ? 'deckCardsList' : 'asrDeckCardsList';
    const list = document.getElementById(listId);
    if (!list) return;
    
    list.innerHTML = '<li class="placeholder">加载中...</li>';
    
    if (typeof pycmd === 'function') {
        pycmd(`fetch_deck_cards::${JSON.stringify(deckName)}`);
    }
}

// 导出函数供全局使用
window.loadDeckCards = loadDeckCards;

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
        if (!inputText.trim()) {
            if (typeof window.displayTemporaryMessage === 'function') {
                window.displayTemporaryMessage("请输入日文句子！", "red", 3000);
            }
            return;
        }
        // 去除括号内的内容（如：働（はたら）き → 働き）
        inputText = removeParenthesesContent(inputText);
        pycmd(`generate_preview::${JSON.stringify([inputText])}`);
    });
    // 日文输入框：自动删除空格和括号内容
    const inputTextElement = document.getElementById('inputText');
    if (inputTextElement) {
        let lastValue = inputTextElement.value;
        
        // 监听输入事件，实时删除空格和处理括号内容
        inputTextElement.addEventListener('input', (event) => {
            let originalValue = event.target.value;
            const cursorPosition = event.target.selectionStart;
            
            // 检测是否输入了句号：比较新旧文本，找出新增的字符
            let lastChar = '';
            if (originalValue.length > lastValue.length) {
                // 文本增加了，找到新增的字符
                // 简单方法：检查光标位置之前的字符是否是句号
                if (cursorPosition > 0) {
                    lastChar = originalValue.charAt(cursorPosition - 1);
                }
            }
            
            // 先删除空格
            let newValue = originalValue.replace(/\s+/g, '');
            let cursorOffset = 0;
            if (originalValue !== newValue) {
                // 计算光标前有多少个空格被删除
                const textBeforeCursor = originalValue.substring(0, cursorPosition);
                const textBeforeCursorCleaned = textBeforeCursor.replace(/\s+/g, '');
                const spacesRemovedBeforeCursor = textBeforeCursor.length - textBeforeCursorCleaned.length;
                cursorOffset = -spacesRemovedBeforeCursor;
            }
            
            // 然后处理括号内容（仅在遇到句号时自动处理）
            const processed = processInputText(newValue, cursorPosition + cursorOffset, lastChar);
            if (processed.shouldProcess) {
                newValue = processed.processedText;
            }
            const newCursorPosition = processed.shouldProcess 
                ? processed.newCursorPosition 
                : (cursorPosition + cursorOffset);
            
            if (originalValue !== newValue || cursorOffset !== 0) {
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
        
        // 监听粘贴事件，删除粘贴内容中的空格和处理括号内容
        inputTextElement.addEventListener('paste', (event) => {
            event.preventDefault();
            const pastedText = (event.clipboardData || window.clipboardData).getData('text');
            
            // 先删除空格
            let cleanedText = pastedText.replace(/\s+/g, '');
            
            // 然后处理括号内容
            cleanedText = removeParenthesesContent(cleanedText);
            
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
        
        // 监听键盘事件（Ctrl/Cmd+Enter）
        inputTextElement.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            document.getElementById('generateButton').click();
        }
    });
    }

    // 目标牌组输入框：处理输入法（IME）输入，避免 datalist 干扰
    // 方案：检测实际输入行为，只有在真正输入时才移除 datalist
    const deckNameInput = document.getElementById('deckName');
    const asrDeckNameInput = document.getElementById('asrDeckName');
    
    // 辅助函数：为输入框设置输入法支持
    function setupImeSupport(inputElement) {
        if (!inputElement) return;
        
        let originalListValue = inputElement.getAttribute('list');
        let isComposing = false;
        let hasUserInput = false;
        let restoreTimeout = null;
        
        // 检测用户是否真的在输入（而不是点击下拉选项）
        inputElement.addEventListener('keydown', (e) => {
            // 如果按下的不是方向键、Tab、Enter等导航键，说明用户在输入
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'].includes(e.key)) {
                hasUserInput = true;
                // 如果 datalist 还在，立即移除
                if (inputElement.hasAttribute('list')) {
                    originalListValue = inputElement.getAttribute('list');
                    inputElement.removeAttribute('list');
                }
            }
        });
        
        // 输入法开始组合时，移除 datalist
        inputElement.addEventListener('compositionstart', () => {
            isComposing = true;
            hasUserInput = true;
            if (restoreTimeout) {
                clearTimeout(restoreTimeout);
                restoreTimeout = null;
            }
            if (inputElement.hasAttribute('list')) {
                originalListValue = inputElement.getAttribute('list');
                inputElement.removeAttribute('list');
            }
        });
        
        // 输入法组合过程中，确保 datalist 保持移除状态
        inputElement.addEventListener('compositionupdate', () => {
            isComposing = true;
            hasUserInput = true;
            if (inputElement.hasAttribute('list')) {
                originalListValue = inputElement.getAttribute('list');
                inputElement.removeAttribute('list');
            }
        });
        
        // 输入法组合结束时，延迟恢复 datalist（如果用户没有继续输入）
        inputElement.addEventListener('compositionend', () => {
            isComposing = false;
            if (restoreTimeout) {
                clearTimeout(restoreTimeout);
            }
            // 延迟恢复，给用户时间继续输入或选择
            restoreTimeout = setTimeout(() => {
                if (!isComposing && !hasUserInput && originalListValue && inputElement.matches(':focus')) {
                    inputElement.setAttribute('list', originalListValue);
                }
            }, 500);
        });
        
        // 失去焦点时，重置状态并恢复 datalist
        inputElement.addEventListener('blur', () => {
            hasUserInput = false;
            isComposing = false;
            if (restoreTimeout) {
                clearTimeout(restoreTimeout);
            }
            restoreTimeout = setTimeout(() => {
                if (originalListValue && !inputElement.matches(':focus')) {
                    inputElement.setAttribute('list', originalListValue);
                }
            }, 100);
        });
        
        // 获得焦点时，重置输入状态（允许用户点击下拉选项）
        inputElement.addEventListener('focus', () => {
            // 只有在没有用户输入的情况下才保持 datalist
            if (!hasUserInput && originalListValue && !inputElement.hasAttribute('list')) {
                inputElement.setAttribute('list', originalListValue);
            }
        });
        
        // 监听 input 事件，如果用户输入了内容，标记为已输入
        inputElement.addEventListener('input', (e) => {
            // 如果输入事件不是由 composition 触发的，说明用户在直接输入
            if (!isComposing) {
                hasUserInput = true;
                if (inputElement.hasAttribute('list')) {
                    originalListValue = inputElement.getAttribute('list');
                    inputElement.removeAttribute('list');
                }
            }
        });
    }
    
    // 为两个输入框设置输入法支持
    setupImeSupport(deckNameInput);
    setupImeSupport(asrDeckNameInput);

    // TTS 提供者切换
    const settingsTtsProvider = document.getElementById('settingsTtsProvider');
    if (settingsTtsProvider) {
        settingsTtsProvider.addEventListener('change', function() {
            const selectedProvider = this.value;
            const qwenGroup = document.getElementById('qwenTtsOptionsGroup');
            const cosyvoiceGroup = document.getElementById('cosyvoiceTtsOptionsGroup');
            const ssmlEnabled = document.getElementById('settingsSsmlEnabled');
            const ssmlRules = document.getElementById('settingsSsmlRules');
            const ssmlHint = document.getElementById('ssmlHint');
            
            if (selectedProvider === 'qwen-tts') {
                // 显示 Qwen-TTS 选项，隐藏 CosyVoice 选项
                if (qwenGroup) qwenGroup.style.display = 'block';
                if (cosyvoiceGroup) cosyvoiceGroup.style.display = 'none';
                // Qwen-TTS 不支持 SSML，禁用 SSML 选项
                if (ssmlEnabled) {
                    ssmlEnabled.disabled = true;
                    ssmlEnabled.checked = false;
                }
                if (ssmlRules) ssmlRules.disabled = true;
                if (ssmlHint) ssmlHint.textContent = 'Qwen-TTS 不支持 SSML';
            } else if (selectedProvider === 'cosyvoice-v2') {
                // 显示 CosyVoice 选项，隐藏 Qwen-TTS 选项
                if (qwenGroup) qwenGroup.style.display = 'none';
                if (cosyvoiceGroup) cosyvoiceGroup.style.display = 'block';
                // CosyVoice 支持 SSML，启用 SSML 选项
                if (ssmlEnabled) ssmlEnabled.disabled = false;
                if (ssmlRules) ssmlRules.disabled = false;
                if (ssmlHint) ssmlHint.textContent = '仅 CosyVoice-v2 支持 SSML';
            }
        });
        
        // 初始化时触发一次，确保界面状态正确
        settingsTtsProvider.dispatchEvent(new Event('change'));
    }

    // 音频转文字
    const asrGenerateButton = document.getElementById('asrGenerateButton');
    if (asrGenerateButton) {
        console.log('[setupEventListeners] ASR按钮找到，绑定事件监听器');
        asrGenerateButton.addEventListener('click', () => {
            console.log('[ASR] 按钮被点击');
            const audioUrl = getInputValue('asrAudioUrl');
            console.log('[ASR] 音频URL:', audioUrl);
            if (!audioUrl || !audioUrl.trim()) {
                console.warn('[ASR] 音频URL为空');
                if (typeof window.displayTemporaryMessage === 'function') {
                    window.displayTemporaryMessage("请输入音频地址！", "red", 3000);
                }
                return;
            }
            console.log('[ASR] 准备调用pycmd，URL:', audioUrl);
            const cmd = `asr_transcribe::${JSON.stringify([audioUrl])}`;
            console.log('[ASR] 命令:', cmd);
            pycmd(cmd);
            console.log('[ASR] pycmd已调用');
        });
    } else {
        console.error('[setupEventListeners] 未找到ASR按钮元素！');
    }

    // 设置
    document.getElementById('saveSettingsButton').addEventListener('click', () => {
        pycmd(`save_config::${JSON.stringify(collectSettingsData())}`);
    });

           // 牌组卡片列表 (事件委托) - 生成器tab
           const deckCardsList = document.getElementById('deckCardsList');
           if (deckCardsList) {
               deckCardsList.addEventListener('click', (event) => {
                   // 如果点击的是删除按钮，不处理选择
                   if (event.target.classList.contains('history-delete-btn')) {
                       return;
                   }
        const li = event.target.closest('li');
                   if (li && li.dataset.nid) {
                       document.querySelectorAll('#deckCardsList li').forEach(item => item.classList.remove('selected'));
                       li.classList.add('selected');
                       const previewPanel = document.getElementById('generatorPreviewPanel');
                       if (previewPanel) {
                           previewPanel.innerHTML = '<div class="preview-placeholder loading"><p>正在加载卡片详情...</p></div>';
                           pycmd(`fetch_card_details::[${parseInt(li.dataset.nid)}]`);
            }
        }
    });
           }
           
           // 牌组卡片列表 (事件委托) - ASR tab
           const asrDeckCardsList = document.getElementById('asrDeckCardsList');
           if (asrDeckCardsList) {
               asrDeckCardsList.addEventListener('click', (event) => {
                   // 如果点击的是删除按钮，不处理选择
                   if (event.target.classList.contains('history-delete-btn')) {
                       return;
                   }
                   const li = event.target.closest('li');
                   if (li && li.dataset.nid) {
                       document.querySelectorAll('#asrDeckCardsList li').forEach(item => item.classList.remove('selected'));
                       li.classList.add('selected');
                       const previewPanel = document.getElementById('asrPreviewPanel');
                       if (previewPanel) {
                           previewPanel.innerHTML = '<div class="preview-placeholder loading"><p>正在加载卡片详情...</p></div>';
                           pycmd(`fetch_card_details::[${parseInt(li.dataset.nid)}]`);
                       }
                   }
               });
           }

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
        // 如果点击的是删除按钮，不处理选择
        if (event.target.classList.contains('history-delete-btn')) {
            return;
        }
        const li = event.target.closest('li');
        if (li && li.dataset.nid) {
            document.querySelectorAll('#deckCardList li').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
            // 更新当前索引
            if (li.dataset.index !== undefined) {
                if (typeof setCurrentCardIndex === 'function') {
                    setCurrentCardIndex(parseInt(li.dataset.index));
                }
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
        
        // 辅助函数：安全播放音频（局部函数，用于双击播放）
        const safePlayAudioLocal = (audio) => {
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
            safePlayAudioLocal(audioPlayer);
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
                            safePlayAudioLocal(audio);
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
        if (!window.isFullscreenMode) {
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
                if (typeof handleFullscreenKeyboard === 'function') {
                    handleFullscreenKeyboard(event);
                }
                return false;
            }
        }
    }, true); // 使用捕获阶段，确保优先处理
    
    // 全屏模式下双击卡片内容播放音频
    document.addEventListener('dblclick', (event) => {
        if (!window.isFullscreenMode) {
            return;
        }
        
        // 检查是否点击在全屏预览区域内
        const fullscreenPreview = document.getElementById('fullscreenPreview');
        if (fullscreenPreview && fullscreenPreview.contains(event.target)) {
            // 如果点击的不是按钮或链接，则播放音频
            if (event.target.tagName !== 'BUTTON' && event.target.tagName !== 'A' && !event.target.closest('button') && !event.target.closest('a')) {
                console.log('[全屏双击] 双击卡片内容，播放音频');
                if (typeof playFullscreenAudio === 'function') {
                    playFullscreenAudio();
                }
            }
        }
    });
}

// DOM加载完成后，绑定所有事件
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupResizers();
    setupDeckCardsPanel();
});

