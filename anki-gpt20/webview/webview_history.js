// webview_history.js - 会话历史模块

// 分离生成器和ASR的会话历史
window.generatorHistory = [];
window.asrHistory = [];

/**
 * 从Python加载会话历史
 */
window.loadSessionHistory = function(generatorHistory, asrHistory) {
    console.log('[loadSessionHistory] 加载会话历史，生成器:', generatorHistory.length, 'ASR:', asrHistory.length);
    window.generatorHistory = generatorHistory || [];
    window.asrHistory = asrHistory || [];
    updateHistoryList();
    updateAsrHistoryList();
};

/**
 * 保存会话历史到Python
 */
function saveSessionHistory(historyType) {
    const history = historyType === 'generator' ? window.generatorHistory : window.asrHistory;
    // 限制最多50条
    const limitedHistory = history.slice(0, 50);
    if (typeof pycmd === 'function') {
        pycmd(`save_session_history::${JSON.stringify([historyType, limitedHistory])}`);
    }
}

/**
 * 更新历史记录列表（生成器tab）
 */
function updateHistoryList() {
    const list = document.getElementById('historyList');
    if (!list) return;
    list.innerHTML = '';
    if (!window.generatorHistory || window.generatorHistory.length === 0) {
        list.innerHTML = '<li class="placeholder">暂无历史记录</li>';
        return;
    }
    window.generatorHistory.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'history-item-text';
        textSpan.textContent = item.frontContent.substring(0, 30) + (item.frontContent.length > 30 ? '...' : '');
        textSpan.dataset.historyId = item.historyId;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'history-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = '删除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem('generator', item.historyId);
        });
        
        li.appendChild(textSpan);
        li.appendChild(deleteBtn);
        li.dataset.historyId = item.historyId;
        list.appendChild(li);
    });
}

/**
 * 更新历史记录列表（ASR tab）
 */
function updateAsrHistoryList() {
    const list = document.getElementById('asrHistoryList');
    if (!list) return;
    list.innerHTML = '';
    if (!window.asrHistory || window.asrHistory.length === 0) {
        list.innerHTML = '<li class="placeholder">暂无历史记录</li>';
        return;
    }
    window.asrHistory.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'history-item-text';
        textSpan.textContent = item.frontContent.substring(0, 30) + (item.frontContent.length > 30 ? '...' : '');
        textSpan.dataset.historyId = item.historyId;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'history-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = '删除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem('asr', item.historyId);
        });
        
        li.appendChild(textSpan);
        li.appendChild(deleteBtn);
        li.dataset.historyId = item.historyId;
        list.appendChild(li);
    });
}

/**
 * 删除历史记录项
 */
function deleteHistoryItem(historyType, historyId) {
    if (historyType === 'generator') {
        window.generatorHistory = window.generatorHistory.filter(item => item.historyId !== historyId);
        updateHistoryList();
    } else if (historyType === 'asr') {
        window.asrHistory = window.asrHistory.filter(item => item.historyId !== historyId);
        updateAsrHistoryList();
    }
    
    // 保存到Python
    if (typeof pycmd === 'function') {
        pycmd(`delete_session_history::${JSON.stringify([historyType, historyId])}`);
    }
}

/**
 * 选择历史记录项（生成器tab）
 */
function selectHistoryItem(selectedLi) {
    document.querySelectorAll('#historyList li').forEach(item => item.classList.remove('selected'));
    selectedLi.classList.add('selected');
    const historyId = selectedLi.dataset.historyId;
    const cardData = window.generatorHistory.find(item => item.historyId === historyId);
    if (cardData) {
        // 使用生成器tab的预览面板
        const previewPanel = document.getElementById('generatorPreviewPanel');
        if (previewPanel && typeof renderCardPreview === 'function') {
            renderCardPreview(previewPanel, cardData);
        }
    }
}

/**
 * 选择历史记录项（ASR tab）
 */
function selectAsrHistoryItem(selectedLi) {
    document.querySelectorAll('#asrHistoryList li').forEach(item => item.classList.remove('selected'));
    selectedLi.classList.add('selected');
    const historyId = selectedLi.dataset.historyId;
    const cardData = window.asrHistory.find(item => item.historyId === historyId);
    if (cardData) {
        // 使用ASR tab的预览面板
        const previewPanel = document.getElementById('asrPreviewPanel');
        if (previewPanel && typeof renderCardPreview === 'function') {
            renderCardPreview(previewPanel, cardData);
        }
    }
}

