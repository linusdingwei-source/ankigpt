// webview_deck_browser.js - 牌组浏览模块

// 牌组浏览相关变量
let deckCardList = []; // 保存当前牌组的卡片列表
let currentCardIndex = -1; // 当前卡片索引

/**
 * 应用保存的列表面板宽度
 */
function applySavedPanelWidth() {
    const listPanel = document.getElementById('deckCardListPanel');
    if (!listPanel) return;
    
    const savedWidth = window.ankiGptConfig?.browser_list_panel_width;
    if (savedWidth && savedWidth >= 200 && savedWidth <= window.innerWidth * 0.6) {
        listPanel.style.width = savedWidth + 'px';
    }
}

/**
 * 保存列表面板宽度到配置
 */
window.saveBrowserPanelWidth = function(width) {
    if (!window.ankiGptConfig) {
        window.ankiGptConfig = {};
    }
    window.ankiGptConfig.browser_list_panel_width = width;
    
    // 保存到后端配置（通过pycmd）
    if (typeof pycmd === 'function') {
        const configUpdate = {
            browser_list_panel_width: width
        };
        pycmd(`save_config::${JSON.stringify(configUpdate)}`);
    }
};

/**
 * 初始化可拖动分隔条
 */
function initBrowserResizer() {
    const resizer = document.getElementById('browserResizer');
    const listPanel = document.getElementById('deckCardListPanel');
    
    if (!resizer || !listPanel) {
        console.warn('[initBrowserResizer] 未找到分隔条或列表面板');
        return;
    }
    
    // 应用保存的宽度
    applySavedPanelWidth();
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = listPanel.offsetWidth;
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // 防止拖动时选中文本
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const diff = e.clientX - startX;
        const newWidth = startWidth + diff;
        const minWidth = 200;
        const maxWidth = window.innerWidth * 0.6; // 最大宽度为窗口的60%
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            listPanel.style.width = newWidth + 'px';
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // 保存宽度到配置
            const width = listPanel.offsetWidth;
            if (window.saveBrowserPanelWidth) {
                window.saveBrowserPanelWidth(width);
            }
        }
    });
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowserResizer);
} else {
    // DOM已经加载完成
    setTimeout(initBrowserResizer, 100); // 延迟一点确保所有元素都已创建
}

// 配置加载后也应用宽度
if (typeof window !== 'undefined') {
    // 监听配置初始化
    const originalInitializeUI = window.initializeUI;
    if (originalInitializeUI) {
        window.initializeUI = function(config, decks, noteTypes) {
            originalInitializeUI(config, decks, noteTypes);
            // 配置加载后应用保存的宽度
            setTimeout(applySavedPanelWidth, 100);
        };
    }
    
    // 也监听loadConfigIntoForms（如果被直接调用）
    const originalLoadConfig = window.loadConfigIntoForms;
    if (originalLoadConfig) {
        window.loadConfigIntoForms = function(config) {
            originalLoadConfig(config);
            // 配置加载后应用保存的宽度
            setTimeout(applySavedPanelWidth, 50);
        };
    }
}

/**
 * 填充牌组浏览器下拉列表
 */
window.populateDeckBrowser = function(decks) {
    const select = document.getElementById('deckBrowserSelect');
    select.innerHTML = '<option value="">-- 请选择一个牌组 --</option>';
    decks.forEach(deckName => {
        select.appendChild(new Option(deckName, deckName));
    });
};

/**
 * 填充牌组卡片列表（通用函数）
 * @param {Array} cards - 卡片列表
 * @param {string} listId - 列表元素ID（可选，默认使用deckCardList）
 * @param {number} preserveIndex - 是否保留当前索引（用于删除后刷新）
 */
function populateCardList(cards, listId, preserveIndex) {
    const list = document.getElementById(listId || 'deckCardList');
    if (!list) {
        console.error('[populateCardList] 未找到列表元素:', listId);
        return;
    }
    
    list.innerHTML = '';
    if (cards.length === 0) {
        list.innerHTML = '<li class="placeholder">此牌组中没有卡片</li>';
        return;
    }
    
    cards.forEach((card, index) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'history-item-text';
        textSpan.textContent = card.front.substring(0, 30) + (card.front.length > 30 ? '...' : '');
        textSpan.dataset.nid = card.nid;
        textSpan.dataset.index = index;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'history-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = '删除卡片';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定要删除这张卡片吗？')) {
                deleteDeckCard(card.nid, listId);
            }
        });
        
        li.appendChild(textSpan);
        li.appendChild(deleteBtn);
        li.dataset.nid = card.nid;
        li.dataset.index = index;
        list.appendChild(li);
    });
}

/**
 * 填充牌组浏览器tab的卡片列表
 * @param {Array} cards - 卡片列表
 * @param {number} preserveIndex - 是否保留当前索引（用于删除后刷新）
 */
window.populateDeckCardList = function(cards, preserveIndex) {
    deckCardList = cards; // 保存卡片列表
    if (!preserveIndex) {
        currentCardIndex = -1; // 重置索引
    }
    populateCardList(cards, 'deckCardList', preserveIndex);
    
    if (cards.length === 0) {
        // 清空预览区
        const previewPanel = document.getElementById('deckCardPreview');
        if (previewPanel) {
            previewPanel.innerHTML = '<div class="preview-placeholder"><p>此牌组中没有卡片</p></div>';
        }
    }
};

/**
 * 填充生成器tab的牌组卡片列表
 * @param {Array} cards - 卡片列表
 */
window.populateGeneratorDeckCards = function(cards) {
    populateCardList(cards, 'deckCardsList', false);
};

/**
 * 填充ASR tab的牌组卡片列表
 * @param {Array} cards - 卡片列表
 */
window.populateAsrDeckCards = function(cards) {
    populateCardList(cards, 'asrDeckCardsList', false);
};

/**
 * 删除卡片
 */
function deleteDeckCard(nid, listId) {
    if (typeof pycmd === 'function') {
        pycmd(`delete_deck_card::[${nid}]`);
    }
    
    // 如果是生成器或ASR tab的卡片，需要刷新对应的列表
    if (listId === 'deckCardsList') {
        const deckNameInput = document.getElementById('deckName');
        if (deckNameInput && deckNameInput.value.trim()) {
            setTimeout(() => {
                if (typeof loadDeckCards === 'function') {
                    loadDeckCards('generator', deckNameInput.value.trim());
                }
            }, 500);
        }
    } else if (listId === 'asrDeckCardsList') {
        const deckNameInput = document.getElementById('asrDeckName');
        if (deckNameInput && deckNameInput.value.trim()) {
            setTimeout(() => {
                if (typeof loadDeckCards === 'function') {
                    loadDeckCards('asr', deckNameInput.value.trim());
                }
            }, 500);
        }
    }
}

/**
 * 显示卡片详情（通用函数，根据当前激活的tab选择预览面板）
 */
window.displayDeckCardDetails = function(cardData) {
    console.log('[displayDeckCardDetails] 收到卡片数据:', cardData ? '有数据' : '无数据');
    console.log('[displayDeckCardDetails] 全屏模式状态:', window.isFullscreenMode);
    
    // 根据当前激活的tab选择预览面板
    let previewPanel = null;
    const generatorTab = document.getElementById('generatorTab');
    const asrTab = document.getElementById('asrTab');
    const browserTab = document.getElementById('browserTab');
    
    if (generatorTab && generatorTab.classList.contains('active')) {
        previewPanel = document.getElementById('generatorPreviewPanel');
        console.log('[displayDeckCardDetails] 使用生成器tab的预览面板');
    } else if (asrTab && asrTab.classList.contains('active')) {
        previewPanel = document.getElementById('asrPreviewPanel');
        console.log('[displayDeckCardDetails] 使用ASR tab的预览面板');
    } else if (browserTab && browserTab.classList.contains('active')) {
        previewPanel = document.getElementById('deckCardPreview');
        console.log('[displayDeckCardDetails] 使用牌组浏览tab的预览面板');
    }
    
    if (!previewPanel) {
        console.error('[displayDeckCardDetails] 未找到预览面板');
        return;
    }
    
    const loadingPlaceholder = previewPanel.querySelector('.preview-placeholder.loading');
    if(loadingPlaceholder) {
        loadingPlaceholder.remove();
    }
    if (typeof renderCardPreview === 'function') {
        renderCardPreview(previewPanel, cardData);
    }
    
    // 如果处于全屏模式，也更新全屏预览
    if (window.isFullscreenMode) {
        console.log('[displayDeckCardDetails] 全屏模式，更新全屏预览');
        const fullscreenPreview = document.getElementById('fullscreenPreview');
        if (fullscreenPreview) {
            console.log('[displayDeckCardDetails] 找到全屏预览容器，开始渲染');
            if (typeof renderCardPreview === 'function') {
                renderCardPreview(fullscreenPreview, cardData);
            }
            if (typeof updateFullscreenCounter === 'function') {
                updateFullscreenCounter();
            }
            
            // 检查是否需要自动播放
            const shouldAutoPlay = fullscreenPreview.dataset.autoPlay === 'true' && window.fullscreenAutoPlay;
            if (shouldAutoPlay && typeof handleFullscreenAutoPlay === 'function') {
                handleFullscreenAutoPlay(fullscreenPreview);
            }
            // 清除自动播放标志
            fullscreenPreview.dataset.autoPlay = 'false';
        } else {
            console.error('[displayDeckCardDetails] 未找到全屏预览容器！');
        }
    }
};

/**
 * 获取当前卡片索引
 */
function getCurrentCardIndex() {
    return currentCardIndex;
}

/**
 * 设置当前卡片索引
 */
function setCurrentCardIndex(index) {
    currentCardIndex = index;
}

/**
 * 获取卡片列表
 */
function getDeckCardList() {
    return deckCardList;
}

