// webview_interactive_player.js - 交互式播放器模块

console.log('[webview_interactive_player] 脚本开始加载');

// 存储当前的时间戳数据
let currentTimestamps = [];
let currentParentContainer = null;

// 时间轴编辑器状态
let timelineEditorState = {
    audioContext: null,
    audioBuffer: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    zoomLevel: 1,
    scrollPosition: 0, // 滚动位置（时间，秒）
    viewStartTime: 0, // 当前视图的起始时间
    viewEndTime: 0, // 当前视图的结束时间
    draggedBlock: null,
    savedBackgroundData: null, // 保存的播放头区域背景图像数据
    savedBackgroundX: -1, // 保存的背景对应的X位置
    dragOffset: 0,
    canvas: null,
    audioPlayer: null,
    lastPlayheadX: -1 // 上一个播放头的X位置，用于清除
};

/**
 * 渲染交互式句子（带时间戳的单词）
 */
function renderInteractiveSentence(container, timestamps, parentContainer) {
    console.log('[renderInteractiveSentence] 开始渲染，容器:', container ? container.id || container.className : '未知', '时间戳数量:', timestamps.length);
    
    // 保存当前时间戳数据
    currentTimestamps = JSON.parse(JSON.stringify(timestamps)); // 深拷贝
    currentParentContainer = parentContainer;
    
    container.innerHTML = '';
    
    // 添加时间轴编辑器按钮到正面卡片标题旁边
    // 找到父容器 .preview-group 中的 strong 标签（"正面:"）
    const previewGroup = container.closest('.preview-group');
    if (previewGroup) {
        const titleStrong = previewGroup.querySelector('strong');
        if (titleStrong) {
            // 检查是否已经添加过按钮，避免重复添加
            let timelineButton = previewGroup.querySelector('.timeline-editor-btn');
            if (!timelineButton) {
                // 检查是否已经有标题包装器
                let titleWrapper = titleStrong.parentElement;
                if (!titleWrapper.classList.contains('preview-group-title')) {
                    // 创建标题包装器，将strong和按钮放在同一行
                    titleWrapper = document.createElement('div');
                    titleWrapper.className = 'preview-group-title';
                    titleWrapper.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';
                    // 将strong标签移到包装器中
                    titleStrong.parentNode.insertBefore(titleWrapper, titleStrong);
                    titleWrapper.appendChild(titleStrong);
                }
                
                timelineButton = document.createElement('button');
                timelineButton.className = 'timeline-editor-btn';
                timelineButton.innerHTML = '⏱'; // 使用时钟图标
                timelineButton.title = '时间轴编辑器'; // 鼠标悬停提示
                timelineButton.style.cssText = 'width: 24px; height: 24px; padding: 0; font-size: 16px; background-color: #00aaff; color: white; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;';
    timelineButton.addEventListener('click', () => {
        const audioPlayer = parentContainer.querySelector('.preview-audio');
        if (audioPlayer) {
            showTimestampAdjustDialog(audioPlayer, container, parentContainer);
        } else {
            alert('未找到音频播放器，无法使用时间轴编辑器');
        }
    });
                // 将按钮添加到标题包装器中
                titleWrapper.appendChild(timelineButton);
            }
        }
    }
    
    // 渲染单词
    const wordsContainer = document.createElement('div');
    wordsContainer.className = 'interactive-words-container';
    wordsContainer.style.cssText = 'word-wrap: break-word; overflow-wrap: break-word; white-space: normal;';
    
    timestamps.forEach((word, index) => {
        const text = word.text || '';
        
        // 处理换行符
        if (text === '\n' || text === '\r\n' || text === '\r') {
            wordsContainer.appendChild(document.createElement('br'));
            return;
        }
        
        // 跳过空文本（但保留空格）
        if (text.trim() === '' && text !== ' ') {
            // 如果是空格，保留它
            if (text === ' ') {
                const spaceSpan = document.createElement('span');
                spaceSpan.textContent = ' ';
                spaceSpan.className = 'interactive-word';
                spaceSpan.style.padding = '0 1px';
                spaceSpan.dataset.startTime = word.begin_time;
                spaceSpan.dataset.endTime = word.end_time;
                spaceSpan.dataset.index = index;
                wordsContainer.appendChild(spaceSpan);
            }
            return;
        }
        
        const span = document.createElement('span');
        span.textContent = text;
        span.className = 'interactive-word';
        span.dataset.startTime = word.begin_time;
        span.dataset.endTime = word.end_time;
        span.dataset.index = index;
        span.addEventListener('click', (e) => {
            // 点击单词播放音频
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
        wordsContainer.appendChild(span);
    });
    
    container.appendChild(wordsContainer);
    
    const wordCount = container.querySelectorAll('.interactive-word').length;
    const brCount = wordsContainer.querySelectorAll('br').length;
    console.log('[renderInteractiveSentence] 已渲染', wordsContainer.children.length, '个元素到容器');
    console.log('[renderInteractiveSentence] 其中单词:', wordCount, '个，换行:', brCount, '个');
    
    // 确保容器可见
    if (container.style.display === 'none') {
        container.style.display = 'block';
    }
    
    // 检查是否有内容
    if (wordsContainer.children.length === 0) {
        console.warn('[renderInteractiveSentence] 警告：没有渲染任何内容！');
        const placeholder = document.createElement('div');
        placeholder.textContent = '无内容可显示';
        placeholder.style.cssText = 'color: #aaa; padding: 20px; text-align: center;';
        wordsContainer.appendChild(placeholder);
    }
    
    console.log('[renderInteractiveSentence] 渲染完成，单词数量:', wordCount);
}

// 确保函数在全局作用域中可用（立即执行）
(function() {
    if (typeof window !== 'undefined') {
        window.renderInteractiveSentence = renderInteractiveSentence;
        window.attachAudioEventListeners = attachAudioEventListeners;
        console.log('[webview_interactive_player] 函数已立即挂载到window对象:', {
            renderInteractiveSentence: typeof window.renderInteractiveSentence,
            attachAudioEventListeners: typeof window.attachAudioEventListeners
        });
    }
})();

/**
 * 为音频播放器绑定事件监听器，实现高亮效果
 */
function attachAudioEventListeners(parentContainer) {
    console.log('[attachAudioEventListeners] 开始绑定事件，容器:', parentContainer ? parentContainer.id || parentContainer.className : '未知');
    const audioPlayer = parentContainer.querySelector('.preview-audio');
    const sentenceContainer = parentContainer.querySelector('.interactive-sentence') || parentContainer.querySelector('.interactive-words-container');
    
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

/**
 * 显示时间轴编辑器对话框
 */
function showTimestampAdjustDialog(audioPlayer, container, parentContainer) {
    console.log('[showTimestampAdjustDialog] 对话框验证');
    
    // 检查或创建对话框
    let dialog = document.getElementById('timestampAdjustDialog');
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'timestampAdjustDialog';
        dialog.innerHTML = `
            <div class="timeline-dialog-content">
                <div class="timeline-dialog-header">
                    <h3>时间轴编辑器</h3>
                    <button id="closeTimelineDialog" class="close-btn">×</button>
                </div>
                <div class="timeline-dialog-body">
                    <div class="timeline-controls">
                        <button id="playPauseBtn" class="timeline-btn">播放</button>
                        <input type="range" id="seekBar" min="0" max="100" value="0" class="timeline-seekbar">
                        <span id="currentTimeDisplay">0:00</span> / <span id="totalTimeDisplay">0:00</span>
                        <button id="zoomInBtn" class="timeline-btn">放大</button>
                        <button id="zoomOutBtn" class="timeline-btn">缩小</button>
                    </div>
                    <div id="timelineContainer" class="timeline-container">
                        <div id="timelineContent" class="timeline-content">
                            <canvas id="timelineCanvas"></canvas>
                        </div>
                    </div>
                </div>
                <div class="timeline-dialog-footer">
                    <button id="saveTimelineBtn" class="timeline-btn primary">保存</button>
                    <button id="cancelTimelineBtn" class="timeline-btn">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }
    
    // 强制设置对话框样式
    Object.assign(dialog.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: '99999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0',
        padding: '0',
        border: 'none',
        transform: 'none'
    });
    dialog.setAttribute('style', dialog.style.cssText + ' !important');
    
    // 验证对话框位置和尺寸
    setTimeout(() => {
        const rect = dialog.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(dialog);
        console.log('[showTimestampAdjustDialog] 对话框验证:');
        console.log('  - 位置: x=' + rect.left + ', y=' + rect.top + ', width=' + rect.width + ', height=' + rect.height);
        console.log('  - 计算样式: position=' + computedStyle.position + ', top=' + computedStyle.top + ', left=' + computedStyle.left);
        console.log('  - 计算样式: width=' + computedStyle.width + ', height=' + computedStyle.height + ', zIndex=' + computedStyle.zIndex);
        console.log('  - 计算样式: display=' + computedStyle.display + ', visibility=' + computedStyle.visibility + ', opacity=' + computedStyle.opacity);
        console.log('  - 窗口尺寸: width=' + window.innerWidth + ', height=' + window.innerHeight);
        console.log('  - 对话框在DOM中: ' + document.body.contains(dialog));
        console.log('  - 对话框父元素: ' + (dialog.parentElement ? dialog.parentElement.tagName : 'null'));
        
        // 如果位置异常，强制修正
        if (rect.left < 0 || rect.top < 0 || rect.width !== window.innerWidth || rect.height !== window.innerHeight) {
            console.warn('[showTimestampAdjustDialog] 对话框位置或尺寸异常，强制设置');
            console.warn('  - 当前位置: x=' + rect.left + ', y=' + rect.top);
            console.warn('  - 需要修正: 是');
            Object.assign(dialog.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: window.innerWidth + 'px',
                height: window.innerHeight + 'px',
                margin: '0',
                padding: '0',
                transform: 'none'
            });
            void dialog.offsetHeight; // 强制重排
        }
        
        const header = dialog.querySelector('.timeline-dialog-header');
        const closeBtn = dialog.querySelector('#closeTimelineDialog');
        console.log('  - 对话框内容检查: header存在=' + !!header + ', 关闭按钮存在=' + !!closeBtn);
    }, 100);
    
    // 绑定关闭按钮
    const closeBtn = dialog.querySelector('#closeTimelineDialog');
    if (closeBtn) {
        closeBtn.onclick = () => {
            dialog.style.display = 'none';
            if (timelineEditorState.audioContext) {
                timelineEditorState.audioContext.close().catch(console.error);
            }
        };
        console.log('[showTimestampAdjustDialog] 关闭按钮已绑定');
    }
    
    // 绑定保存和取消按钮
    const saveBtn = dialog.querySelector('#saveTimelineBtn');
    const cancelBtn = dialog.querySelector('#cancelTimelineBtn');
    if (saveBtn) {
        saveBtn.onclick = () => {
            // 保存时间戳调整（这里可以添加保存逻辑）
            dialog.style.display = 'none';
            if (timelineEditorState.audioContext) {
                timelineEditorState.audioContext.close().catch(console.error);
            }
        };
        console.log('[showTimestampAdjustDialog] 保存按钮已绑定');
    }
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            dialog.style.display = 'none';
            if (timelineEditorState.audioContext) {
                timelineEditorState.audioContext.close().catch(console.error);
            }
        };
    }
    
    // 显示对话框并初始化时间轴编辑器
    dialog.style.display = 'flex';
    console.log('[showTimestampAdjustDialog] 开始初始化时间轴编辑器');
    initTimelineEditor(audioPlayer, container, parentContainer);
}

/**
 * 计算默认缩放级别，使得一个字符的宽度和其对应的音频波形宽度相当
 */
function calculateDefaultZoomLevel(timestamps, duration, canvasWidth) {
    if (!timestamps || timestamps.length === 0 || !duration || duration <= 0) {
        return 1; // 默认缩放级别
    }
    
    // 创建一个临时的canvas上下文来测量文本宽度
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = 'bold 12px sans-serif'; // 使用与句子块相同的字体
    
    let totalCharDuration = 0; // 总字符时长（秒）
    let totalCharWidth = 0; // 总字符宽度（像素）
    let charCount = 0;
    
    // 遍历所有时间戳，计算每个字符的平均时长和宽度
    timestamps.forEach(ts => {
        const text = ts.text || '';
        if (!text || text.trim() === '') return;
        
        const beginTime = (ts.begin_time || 0) / 1000; // 转换为秒
        const endTime = (ts.end_time || ts.begin_time || 0) / 1000;
        const charDuration = endTime - beginTime;
        
        if (charDuration <= 0) return;
        
        // 计算该文本的宽度
        const textWidth = tempCtx.measureText(text).width;
        
        // 计算每个字符的平均时长和宽度
        const charCountInText = text.length;
        if (charCountInText > 0) {
            const avgCharDuration = charDuration / charCountInText;
            const avgCharWidth = textWidth / charCountInText;
            
            totalCharDuration += avgCharDuration * charCountInText;
            totalCharWidth += avgCharWidth * charCountInText;
            charCount += charCountInText;
        }
    });
    
    if (charCount === 0 || totalCharDuration === 0) {
        return 1; // 默认缩放级别
    }
    
    // 计算平均每个字符的时长和宽度
    const avgCharDuration = totalCharDuration / charCount;
    const avgCharWidth = totalCharWidth / charCount;
    
    // 计算目标：一个字符的宽度应该等于其对应的音频波形宽度
    // 如果缩放级别为zoom，那么视图时长 = duration / zoom
    // 一个字符在canvas上的宽度 = (avgCharDuration / (duration / zoom)) * canvasWidth
    // 我们希望：avgCharWidth ≈ (avgCharDuration / (duration / zoom)) * canvasWidth
    // 因此：zoom ≈ (avgCharDuration * canvasWidth) / (avgCharWidth * duration)
    
    const calculatedZoom = (avgCharDuration * canvasWidth) / (avgCharWidth * duration);
    
    // 限制缩放级别在合理范围内（0.5 到 20）
    const finalZoom = Math.max(0.5, Math.min(20, calculatedZoom));
    
    console.log('[calculateDefaultZoomLevel] 计算默认缩放级别:', {
        charCount: charCount,
        avgCharDuration: avgCharDuration.toFixed(4),
        avgCharWidth: avgCharWidth.toFixed(2),
        calculatedZoom: calculatedZoom.toFixed(2),
        finalZoom: finalZoom.toFixed(2)
    });
    
    return finalZoom;
}

/**
 * 初始化时间轴编辑器
 */
function initTimelineEditor(audioPlayer, container, parentContainer) {
    console.log('[initTimelineEditor] 开始初始化，dialog存在:', !!document.getElementById('timestampAdjustDialog'));
    
    const dialog = document.getElementById('timestampAdjustDialog');
    if (!dialog) {
        console.error('[initTimelineEditor] 对话框不存在');
        return;
    }
    
    const timelineContainer = dialog.querySelector('#timelineContainer');
    const timelineContent = dialog.querySelector('#timelineContent');
    const canvas = dialog.querySelector('#timelineCanvas');
    const playPauseBtn = dialog.querySelector('#playPauseBtn');
    const seekBar = dialog.querySelector('#seekBar');
    const currentTimeDisplay = dialog.querySelector('#currentTimeDisplay');
    const totalTimeDisplay = dialog.querySelector('#totalTimeDisplay');
    
    console.log('[initTimelineEditor] DOM元素检查:');
    console.log('  - timelineContainer:', !!timelineContainer);
    console.log('  - timelineContent:', !!timelineContent);
    console.log('  - canvas:', !!canvas);
    console.log('  - playPauseBtn:', !!playPauseBtn);
    console.log('  - seekBar:', !!seekBar);
    console.log('  - currentTimeDisplay:', !!currentTimeDisplay);
    console.log('  - totalTimeDisplay:', !!totalTimeDisplay);
    
    if (!timelineContainer || !timelineContent || !canvas) {
        console.error('[initTimelineEditor] 必要的DOM元素缺失');
        return;
    }
    
    // 设置canvas尺寸
    const containerRect = timelineContainer.getBoundingClientRect();
    console.log('  - timelineContainer尺寸: width=' + containerRect.width + ', height=' + containerRect.height);
    canvas.width = containerRect.width || 1200;
    canvas.height = containerRect.height || 400;
    
    // 获取音频源
    let audioSrc = audioPlayer.src;
    if (!audioSrc && window.currentPreviewData && window.currentPreviewData.audioUrl) {
        audioSrc = window.currentPreviewData.audioUrl;
    }
    
    // 初始化音频上下文
    if (!timelineEditorState.audioContext) {
        timelineEditorState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // 保存引用
    timelineEditorState.canvas = canvas;
    timelineEditorState.audioPlayer = audioPlayer;
    
    // 获取音频时长
    const duration = audioPlayer.duration || 0;
    timelineEditorState.duration = duration;
    timelineEditorState.viewStartTime = 0;
    timelineEditorState.viewEndTime = duration;
    
    // 计算默认缩放级别（基于时间戳数据）
    const defaultZoom = calculateDefaultZoomLevel(currentTimestamps, duration, canvas.width);
    timelineEditorState.zoomLevel = defaultZoom;
    timelineEditorState.scrollPosition = 0;
    
    if (totalTimeDisplay) {
        totalTimeDisplay.textContent = formatTime(duration);
    }
    
    // 绑定缩放按钮
    const zoomInBtn = dialog.querySelector('#zoomInBtn');
    const zoomOutBtn = dialog.querySelector('#zoomOutBtn');
    if (zoomInBtn) {
        zoomInBtn.onclick = () => {
            const oldZoom = timelineEditorState.zoomLevel;
            timelineEditorState.zoomLevel = Math.min(timelineEditorState.zoomLevel * 1.5, 10);
            // 保持当前播放位置在视图中心（如果可能）
            if (timelineEditorState.currentTime > 0) {
                const viewDuration = timelineEditorState.duration / timelineEditorState.zoomLevel;
                timelineEditorState.scrollPosition = Math.max(0, 
                    timelineEditorState.currentTime - viewDuration / 2
                );
            }
            console.log('[缩放] 放大: ' + oldZoom + ' -> ' + timelineEditorState.zoomLevel);
            updateTimelineView();
        };
    }
    if (zoomOutBtn) {
        zoomOutBtn.onclick = () => {
            const oldZoom = timelineEditorState.zoomLevel;
            timelineEditorState.zoomLevel = Math.max(timelineEditorState.zoomLevel / 1.5, 1);
            // 保持当前播放位置在视图中心（如果可能）
            if (timelineEditorState.currentTime > 0) {
                const viewDuration = timelineEditorState.duration / timelineEditorState.zoomLevel;
                timelineEditorState.scrollPosition = Math.max(0, 
                    timelineEditorState.currentTime - viewDuration / 2
                );
            }
            console.log('[缩放] 缩小: ' + oldZoom + ' -> ' + timelineEditorState.zoomLevel);
            updateTimelineView();
        };
    }
    
    // 检测跨域音频
    const isCrossOrigin = audioSrc && (audioSrc.startsWith('http://') || audioSrc.startsWith('https://')) && 
                          !audioSrc.startsWith(window.location.origin);
    
    // 绑定单指拖拽滚动视图功能
    if (canvas && !canvas.dataset.panBound) {
        canvas.dataset.panBound = 'true';
        let isPanning = false;
        let panStartX = 0;
        let panStartScrollPosition = 0;
        
        canvas.addEventListener('mousedown', (e) => {
            // 如果正在拖动句子块，不处理视图拖拽
            if (timelineEditorState.draggedBlock) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 检查是否点击在句子块上（注意：句子块的mousedown事件会阻止冒泡，所以这里可能不会触发）
            let clickedOnBlock = false;
            for (let i = sentenceBlocksData.length - 1; i >= 0; i--) {
                const blockData = sentenceBlocksData[i];
                if (x >= blockData.startX && x <= blockData.startX + blockData.blockWidth && 
                    y >= blockData.blockY && y <= blockData.blockY + blockData.blockHeight) {
                    clickedOnBlock = true;
                    break;
                }
            }
            
            // 如果没有点击在句子块上，且放大状态下，开始拖拽视图
            if (!clickedOnBlock && timelineEditorState.zoomLevel > 1) {
                isPanning = true;
                panStartX = e.clientX;
                panStartScrollPosition = timelineEditorState.scrollPosition;
                canvas.style.cursor = 'grabbing';
                e.preventDefault();
            }
        }); // 使用冒泡阶段，句子块事件会阻止冒泡，所以这里只会在点击空白区域时触发
        
        document.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const deltaX = e.clientX - panStartX;
                
                // 计算滚动距离（转换为时间）
                const viewDuration = timelineEditorState.duration / timelineEditorState.zoomLevel;
                const timePerPixel = viewDuration / canvas.width;
                const timeDelta = -deltaX * timePerPixel; // 负号表示拖拽方向与滚动方向相反
                
                // 更新滚动位置
                const newScrollPosition = panStartScrollPosition + timeDelta;
                const maxScrollPosition = Math.max(0, timelineEditorState.duration - viewDuration);
                timelineEditorState.scrollPosition = Math.max(0, Math.min(maxScrollPosition, newScrollPosition));
                
                // 更新视图
                updateTimelineView();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isPanning) {
                isPanning = false;
                canvas.style.cursor = 'default';
            }
        });
    }
    
    // 初始化视图（会绘制占位波形）
    updateTimelineView();
    
    // 异步加载音频数据
    if (!isCrossOrigin && audioSrc) {
        // 尝试加载音频数据
        loadAudioForTimeline(audioSrc, canvas, duration);
    } else {
        console.log('[initTimelineEditor] 检测到跨域音频URL，使用占位波形模式');
    }
    
    // 绑定播放控制
    if (playPauseBtn && audioPlayer) {
        playPauseBtn.onclick = async () => {
            if (timelineEditorState.isPlaying) {
                console.log('[播放控制] 暂停播放');
                audioPlayer.pause();
                playPauseBtn.textContent = '播放';
                timelineEditorState.isPlaying = false;
            } else {
                console.log('[播放控制] 开始播放');
                try {
                    if (audioPlayer.readyState < 2) {
                        console.log('[播放控制] 音频未就绪，加载中...');
                        audioPlayer.load();
                        await new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => reject(new Error('加载超时')), 5000);
                            audioPlayer.addEventListener('loadedmetadata', () => {
                                clearTimeout(timeout);
                                console.log('[播放控制] 音频加载完成');
                                resolve();
                            }, { once: true });
                        });
                    }
                    await audioPlayer.play();
                    playPauseBtn.textContent = '暂停';
                    timelineEditorState.isPlaying = true;
                    console.log('[播放控制] 播放开始，当前时间:', audioPlayer.currentTime);
                } catch (e) {
                    console.error('[播放控制] 播放失败:', e);
                    alert('播放失败: ' + e.message);
                }
            }
        };
    }
    
    // 绑定进度条
    if (seekBar && audioPlayer) {
        seekBar.max = duration || 100;
        seekBar.oninput = (e) => {
            const time = parseFloat(e.target.value);
            audioPlayer.currentTime = time;
            timelineEditorState.currentTime = time;
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = formatTime(time);
            }
            updatePlayheadPosition(canvas, time, duration);
        };
    }
    
    // 更新播放进度（使用节流机制避免频繁更新）
    if (audioPlayer) {
        let lastUpdateTime = 0;
        const updateInterval = 100; // 最小更新间隔100ms（约10fps），减少更新频率
        let lastRedrawTime = 0;
        const redrawInterval = 500; // 完整重绘最小间隔500ms
        
        const updateProgress = () => {
            if (!timelineEditorState.isPlaying) return;
            
            const now = Date.now();
            if (now - lastUpdateTime < updateInterval) {
                return; // 跳过本次更新
            }
            lastUpdateTime = now;
            
            const time = audioPlayer.currentTime;
            timelineEditorState.currentTime = time;
            
            if (seekBar) {
                seekBar.value = time;
            }
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = formatTime(time);
            }
            
            // 如果播放头超出视图范围，调整视图
            const viewStart = timelineEditorState.viewStartTime;
            const viewEnd = timelineEditorState.viewEndTime;
            if (time < viewStart || time > viewEnd) {
                // 调整视图以跟随播放头
                const viewDuration = viewEnd - viewStart;
                timelineEditorState.scrollPosition = Math.max(0, time - viewDuration / 2);
            }
            
            // 每次更新播放头时都重绘整个视图，确保正确性
            // 限制重绘频率，避免性能问题（每500ms最多重绘一次）
            if (now - lastRedrawTime < redrawInterval) {
                return;
            }
            lastRedrawTime = now;
            
            updateTimelineView();
        };
        audioPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('ended', () => {
            console.log('[播放进度] 播放结束');
            timelineEditorState.isPlaying = false;
            if (playPauseBtn) playPauseBtn.textContent = '播放';
        });
    }
}

/**
 * 加载音频数据用于时间轴
 */
async function loadAudioForTimeline(audioSrc, canvas, duration) {
    try {
        const response = await fetch(audioSrc);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await timelineEditorState.audioContext.decodeAudioData(arrayBuffer);
        timelineEditorState.audioBuffer = audioBuffer;
        // 更新视图（会自动绘制波形、句子块和时间刻度）
        updateTimelineView();
    } catch (e) {
        console.warn('[loadAudioForTimeline] 加载音频失败，使用占位波形:', e);
        timelineEditorState.audioBuffer = null;
        // 更新视图（会自动绘制占位波形、句子块和时间刻度）
        updateTimelineView();
    }
}

/**
 * 绘制占位波形
 */
function drawPlaceholderWaveform(canvas, timestamps, duration) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const scaleHeight = 30; // 为时间刻度预留空间
    const waveformAreaHeight = 100; // 波形区域高度（顶部固定）
    const waveformHeight = waveformAreaHeight * 0.6; // 波形高度
    const centerY = waveformAreaHeight / 2; // 波形中心位置（在顶部区域）
    
    // 计算视图时间范围
    const viewStart = timelineEditorState.viewStartTime;
    const viewEnd = timelineEditorState.viewEndTime;
    const viewDuration = viewEnd - viewStart;
    
    // 根据时间戳密度绘制占位波形
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const step = width / 200;
    for (let i = 0; i < 200; i++) {
        const x = i * step;
        const timeRatio = i / 200;
        const time = viewStart + (timeRatio * viewDuration);
        
        // 计算该时间点的时间戳密度
        const density = timestamps.filter(ts => {
            const start = (ts.begin_time || 0) / 1000;
            const end = (ts.end_time || 0) / 1000;
            return time >= start && time <= end;
        }).length;
        
        const amplitude = Math.min(0.3 + density * 0.1, 1);
        const y = centerY - (amplitude * waveformHeight / 2) * (Math.random() * 0.5 + 0.5);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

/**
 * 绘制时间刻度（确保不覆盖波形区域）
 */
function drawTimeScale(canvas, duration) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.font = '12px monospace';
    ctx.fillStyle = '#aaa';
    
    const scaleHeight = 30;
    const scaleY = height - scaleHeight; // 从底部向上30px
    const waveformAreaHeight = 100; // 波形区域在顶部100px
    
    // 确保时间刻度不会覆盖波形区域
    if (scaleY < waveformAreaHeight) {
        console.warn('[drawTimeScale] 警告：时间刻度区域与波形区域重叠！', 
            'scaleY:', scaleY, 'waveformAreaHeight:', waveformAreaHeight);
    }
    
    // 计算视图时间范围
    const viewStart = timelineEditorState.viewStartTime;
    const viewEnd = timelineEditorState.viewEndTime;
    const viewDuration = viewEnd - viewStart;
    
    // 绘制刻度线（只在底部区域绘制）
    const tickCount = Math.floor(width / 100);
    for (let i = 0; i <= tickCount; i++) {
        const x = (i / tickCount) * width;
        const time = viewStart + (i / tickCount) * viewDuration;
        
        ctx.beginPath();
        ctx.moveTo(x, scaleY);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        // 显示时间标签
        ctx.fillText(formatTime(time), x + 2, height - 5);
    }
}

/**
 * 绘制音频波形
 */
function drawWaveform(canvas, audioBuffer, duration) {
    if (!audioBuffer) {
        console.warn('[drawWaveform] audioBuffer为空，无法绘制波形');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const scaleHeight = 30; // 为时间刻度预留空间
    const waveformAreaHeight = 100; // 波形区域高度（顶部固定）
    const waveformHeight = waveformAreaHeight * 0.6; // 波形高度
    const centerY = waveformAreaHeight / 2; // 波形中心位置（在顶部区域）
    
    // 计算视图时间范围
    const viewStart = timelineEditorState.viewStartTime;
    const viewEnd = timelineEditorState.viewEndTime;
    const viewDuration = viewEnd - viewStart;
    
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const sampleRate = audioBuffer.sampleRate;
    
    console.log('[drawWaveform] 开始绘制，canvas尺寸:', width, 'x', height, 
        '波形区域:', waveformAreaHeight, '视图范围:', viewStart.toFixed(2), '-', viewEnd.toFixed(2));
    
    // 确保使用正确的绘制上下文
    ctx.save();
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    let pointsDrawn = 0;
    let firstPoint = true;
    for (let x = 0; x < width; x++) {
        const timeRatio = x / width;
        const time = viewStart + (timeRatio * viewDuration);
        const sampleIndex = Math.floor(time * sampleRate);
        
        if (sampleIndex >= 0 && sampleIndex < totalSamples) {
            // 计算该时间点附近的样本平均值
            // 确保 windowSize 至少为 1，避免 NaN
            const windowSize = Math.max(1, Math.floor(sampleRate * viewDuration / width));
            const startSample = Math.max(0, sampleIndex - Math.floor(windowSize / 2));
            const endSample = Math.min(totalSamples, sampleIndex + Math.ceil(windowSize / 2));
            
            // 确保至少有一个样本
            if (startSample < endSample) {
                let sum = 0;
                let count = 0;
                for (let i = startSample; i < endSample; i++) {
                    const value = channelData[i];
                    if (!isNaN(value) && isFinite(value)) {
                        sum += Math.abs(value);
                        count++;
                    }
                }
                const average = count > 0 ? sum / count : 0;
                
                // 大幅放大振幅，确保波形可见（音频数据通常很小）
                // 使用对数缩放来更好地显示小振幅
                let amplitude;
                if (average > 0) {
                    // 使用对数缩放：log(1 + x * scale) / log(1 + scale)
                    const scale = 1000;
                    amplitude = Math.log(1 + average * scale) / Math.log(1 + scale);
                } else {
                    amplitude = 0;
                }
                // 确保最小振幅，让波形可见（但不要强制所有点都相同）
                // 使用动态最小振幅，基于实际振幅的百分比
                const minAmplitudeRatio = 0.1; // 最小振幅是最大可能振幅的10%
                const dynamicMinAmplitude = Math.max(0.05, amplitude * minAmplitudeRatio);
                const finalAmplitude = Math.max(amplitude, dynamicMinAmplitude);
                const yOffset = finalAmplitude * waveformHeight / 2;
                const y = Math.max(5, Math.min(height - 5, centerY - yOffset));
                
                // 调试：记录前几个点和中间点的数据
                if (pointsDrawn < 3 || (pointsDrawn > 680 && pointsDrawn < 683)) {
                    console.log(`[drawWaveform] 点${pointsDrawn}: x=${x}, average=${average.toFixed(6)}, amplitude=${amplitude.toFixed(4)}, finalAmplitude=${finalAmplitude.toFixed(4)}, y=${y.toFixed(1)}, centerY=${centerY}, yOffset=${yOffset.toFixed(1)}`);
                }
                
                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
                pointsDrawn++;
            } else {
                // 如果 startSample >= endSample，跳过这个点
                // 不绘制，让路径自然断开
            }
        }
    }
    
    // 确保stroke执行
    if (pointsDrawn > 0) {
        // 在stroke之前，检查路径是否有效
        const pathLength = ctx.getLineDash().length; // 检查路径状态
        ctx.stroke();
        console.log('[drawWaveform] 波形绘制完成，绘制了', pointsDrawn, '个点，中心Y:', centerY);
        
        // 验证波形是否真的被绘制（检查多个点）
        const testPoints = [
            { x: Math.floor(width / 4), y: Math.floor(centerY) },
            { x: Math.floor(width / 2), y: Math.floor(centerY) },
            { x: Math.floor(width * 3 / 4), y: Math.floor(centerY) },
            { x: Math.floor(width / 2), y: Math.floor(centerY - 10) },
            { x: Math.floor(width / 2), y: Math.floor(centerY + 10) }
        ];
        
        let blueCount = 0;
        testPoints.forEach((pt, idx) => {
            const imageData = ctx.getImageData(pt.x, pt.y, 1, 1);
            const hasBlue = imageData.data[2] > 100;
            if (hasBlue) blueCount++;
            if (idx < 2) { // 只记录前两个点的详细信息
                console.log(`[drawWaveform] 验证点${idx}: 位置(${pt.x}, ${pt.y}), 颜色: rgba(${imageData.data[0]}, ${imageData.data[1]}, ${imageData.data[2]}, ${imageData.data[3]}), 有蓝色: ${hasBlue}`);
            }
        });
        console.log('[drawWaveform] 波形验证 - 5个测试点中有', blueCount, '个点有蓝色');
    } else {
        console.warn('[drawWaveform] 警告：没有绘制任何点！');
    }
    ctx.restore();
}

// 存储句子块数据，用于拖动检测
let sentenceBlocksData = [];

// 存储句子边界信息，用于在拖动时保持句子结构不变
let sentenceBoundaries = null; // { sentenceIndex: { startTimestampIndex, endTimestampIndex, timestamps } }

/**
 * 渲染句子块（支持多行布局和重叠）
 */
function renderSentenceBlocks(canvas, timestamps, duration) {
    if (!timestamps || timestamps.length === 0) {
        console.warn('[renderSentenceBlocks] 没有时间戳数据');
        return;
    }
    
    const sentences = groupTimestampsIntoSentences(timestamps);
    console.log('[renderSentenceBlocks] 分组后的句子数量:', sentences.length, 
        '时间戳数量:', timestamps.length);
    
    if (sentences.length === 0) {
        console.warn('[renderSentenceBlocks] 没有句子数据');
        return;
    }
    
    // 记录句子时间范围
    const sentenceTimes = sentences.map(s => {
        const firstTs = s.timestamps?.[0];
        const lastTs = s.timestamps?.[s.timestamps.length - 1];
        return {
            start: (firstTs?.begin_time || 0) / 1000,
            end: (lastTs?.end_time || lastTs?.begin_time || firstTs?.begin_time || 0) / 1000,
            text: s.text?.substring(0, 20)
        };
    });
    if (sentenceTimes.length > 0) {
        console.log('[renderSentenceBlocks] 句子时间范围:', 
            '第一个:', JSON.stringify(sentenceTimes[0]),
            '最后一个:', JSON.stringify(sentenceTimes[sentenceTimes.length - 1]),
            '总数:', sentenceTimes.length);
    }
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const scaleHeight = 30; // 时间刻度高度
    const blockHeight = 35; // 句子块高度
    const blockSpacing = 8; // 块之间的垂直间距
    const waveformAreaHeight = 100; // 波形区域高度（顶部）
    const sentenceAreaTop = waveformAreaHeight + 10; // 句子区域起始位置
    const sentenceAreaBottom = height - scaleHeight - 10; // 句子区域底部位置
    const sentenceAreaHeight = sentenceAreaBottom - sentenceAreaTop; // 可用句子区域高度
    
    // 清空之前的句子块数据
    sentenceBlocksData = [];
    
    // 计算视图时间范围
    const viewStart = timelineEditorState.viewStartTime;
    const viewEnd = timelineEditorState.viewEndTime;
    const viewDuration = viewEnd - viewStart;
    const timePerPixel = viewDuration / width;
    
    // 第一遍遍历：统计可见句子的数量
    let visibleCount = 0;
    const hiddenSentences = [];
    sentences.forEach((sentence, idx) => {
        let startTime = sentence.start / 1000;
        let endTime = sentence.end / 1000;
        
        // 如果句子有时间戳，使用首单词和末单词的时间
        if (sentence.timestamps && sentence.timestamps.length > 0) {
            const firstTs = sentence.timestamps[0];
            const lastTs = sentence.timestamps[sentence.timestamps.length - 1];
            startTime = (firstTs.begin_time || 0) / 1000;
            endTime = (lastTs.end_time || lastTs.begin_time || firstTs.begin_time || 0) / 1000;
        }
        
        // 只统计在视图范围内的句子
        const isVisible = !(endTime < viewStart || startTime > viewEnd);
        if (isVisible) {
            visibleCount++;
        } else {
            hiddenSentences.push({
                index: idx,
                startTime: startTime.toFixed(3),
                endTime: endTime.toFixed(3),
                text: sentence.text?.substring(0, 20),
                reason: endTime < viewStart ? 'before' : 'after'
            });
        }
    });
    
    console.log('[renderSentenceBlocks] 可见性统计:', 
        '总数:', sentences.length,
        '可见:', visibleCount,
        '隐藏:', hiddenSentences.length,
        '视图范围:', viewStart.toFixed(3), '-', viewEnd.toFixed(3));
    if (hiddenSentences.length > 0) {
        console.log('[renderSentenceBlocks] 隐藏的句子示例:', 
            JSON.stringify(hiddenSentences.slice(0, 5)));
    }
    
    // 计算行间距（基于实际可见句子数量）
    const rowSpacing = visibleCount > 0 ? sentenceAreaHeight / visibleCount : sentenceAreaHeight;
    
    // 第二遍遍历：绘制可见句子
    let visibleSentenceIndex = 0; // 只计算可见句子的索引，用于行分配
    
    sentences.forEach((sentence, index) => {
        // 确保使用首单词的时间作为句子开始时间
        let startTime = sentence.start / 1000;
        let endTime = sentence.end / 1000;
        
        // 如果句子有时间戳，使用首单词和末单词的时间
        if (sentence.timestamps && sentence.timestamps.length > 0) {
            const firstTs = sentence.timestamps[0];
            const lastTs = sentence.timestamps[sentence.timestamps.length - 1];
            startTime = (firstTs.begin_time || 0) / 1000;
            endTime = (lastTs.end_time || lastTs.begin_time || firstTs.begin_time || 0) / 1000;
            
            // 同步更新句子的 start 和 end 属性
            sentence.start = firstTs.begin_time || 0;
            sentence.end = lastTs.end_time || lastTs.begin_time || sentence.start;
        }
        
        // 只显示在视图范围内的句子
        if (endTime < viewStart || startTime > viewEnd) {
            // 记录被过滤的句子（前5个和后5个）
            if (index < 5 || index >= sentences.length - 5) {
                console.log('[renderSentenceBlocks] 句子被过滤:', 
                    '索引:', index,
                    '时间:', startTime.toFixed(3), '-', endTime.toFixed(3),
                    '视图:', viewStart.toFixed(3), '-', viewEnd.toFixed(3),
                    '文本:', sentence.text?.substring(0, 30),
                    '原因:', endTime < viewStart ? '在视图前' : '在视图后');
            }
            return;
        }
        
        // 计算X位置（基于视图范围）
        const startX = ((startTime - viewStart) / viewDuration) * width;
        const blockWidth = Math.max(10, ((endTime - startTime) / viewDuration) * width);
        
        // 初始时每个句子都在不同的行（使用可见句子的索引）
        const rowIndex = visibleSentenceIndex;
        visibleSentenceIndex++;
        
        // 计算Y位置（从顶部向下排列，充分利用垂直空间）
        const blockY = sentenceAreaTop + (rowIndex * rowSpacing);
        
        // 确保不超出句子区域
        const finalBlockY = Math.min(
            Math.max(blockY, sentenceAreaTop),
            sentenceAreaBottom - blockHeight
        );
        
        // 确保句子块不会覆盖波形区域（波形在0-100px）
        if (finalBlockY < 100) {
            console.warn('[renderSentenceBlocks] 警告：句子块可能覆盖波形区域！', 
                'blockY:', finalBlockY, '波形区域: 0-100');
        }
        
        // 绘制句子块背景
        ctx.fillStyle = 'rgba(0, 170, 255, 0.4)';
        ctx.fillRect(startX, finalBlockY, blockWidth, blockHeight);
        
        // 绘制句子块边框
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, finalBlockY, blockWidth, blockHeight);
        
        // 绘制文本（如果块足够宽）
        if (blockWidth > 30) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px sans-serif';
            const text = sentence.text.substring(0, Math.floor(blockWidth / 8));
            const textX = startX + 5;
            const textY = finalBlockY + blockHeight / 2 + 4;
            
            // 添加文本阴影以提高可读性
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.fillText(text, textX, textY);
            ctx.shadowBlur = 0;
        }
        
        // 保存句子块数据用于拖动检测
        sentenceBlocksData.push({
            startX: startX,
            blockY: finalBlockY,
            blockWidth: blockWidth,
            blockHeight: blockHeight,
            startTime: startTime,
            endTime: endTime,
            text: sentence.text,
            sentence: sentence,
            rowIndex: rowIndex
        });
        
        // 只在调试模式下输出详细日志
        // console.log(`[renderSentenceBlocks] 句子 ${index + 1}: "${sentence.text.substring(0, 20)}..." 位置: x=${startX.toFixed(1)}, y=${finalBlockY.toFixed(1)}, 宽度=${blockWidth.toFixed(1)}, 行=${rowIndex}`);
    });
    
    // 绑定拖动事件（只绑定一次）
    if (!canvas.dataset.dragBound) {
        canvas.dataset.dragBound = 'true';
        canvas.addEventListener('mousedown', (e) => {
            if (timelineEditorState.draggedBlock) {
                console.log('[renderSentenceBlocks] 忽略新的点击，正在拖动中');
                return; // 如果正在拖动，忽略新的点击
            }
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            console.log('[renderSentenceBlocks] 鼠标按下，检查句子块:', 
                '位置:', x.toFixed(1), y.toFixed(1),
                '句子块数量:', sentenceBlocksData.length);
            
            // 从后往前检查（后绘制的在上层）
            for (let i = sentenceBlocksData.length - 1; i >= 0; i--) {
                const blockData = sentenceBlocksData[i];
                if (x >= blockData.startX && x <= blockData.startX + blockData.blockWidth && 
                    y >= blockData.blockY && y <= blockData.blockY + blockData.blockHeight) {
                    console.log('[renderSentenceBlocks] 点击在句子块上，开始拖动:', 
                        '句子索引:', i,
                        '句子文本:', blockData.sentence?.text?.substring(0, 20),
                        '时间范围:', blockData.startTime.toFixed(3), '-', blockData.endTime.toFixed(3));
                    // 阻止事件冒泡，避免触发视图拖拽
                    e.stopPropagation();
                    handleBlockDrag(e, blockData, canvas, duration);
                    return;
                }
            }
            
            console.log('[renderSentenceBlocks] 未点击在句子块上');
        });
    }
}

/**
 * 将时间戳分组为句子
 * 始终使用保存的句子边界信息（如果存在），避免任何情况下重新划分句子
 */
function groupTimestampsIntoSentences(timestamps) {
    // 如果存在保存的句子边界信息，始终使用它来分组（任何情况下都不重新划分句子）
    if (sentenceBoundaries && Object.keys(sentenceBoundaries).length > 0) {
        const sentences = [];
        const boundaryKeys = Object.keys(sentenceBoundaries).map(idx => parseInt(idx)).sort((a, b) => a - b);
        
        boundaryKeys.forEach((idx) => {
            const boundary = sentenceBoundaries[idx];
            // 使用保存的时间戳引用重新构建句子
            // 过滤出在当前时间戳数组中存在的时间戳（通过引用比较）
            const sentenceTimestamps = boundary.timestamps.filter(savedTs => 
                timestamps.some(currentTs => currentTs === savedTs)
            );
            
            if (sentenceTimestamps.length === 0) {
                return; // 如果时间戳不在当前数组中，跳过
            }
            
            // 按当前时间戳数组中的顺序排序
            sentenceTimestamps.sort((a, b) => {
                const aIndex = timestamps.indexOf(a);
                const bIndex = timestamps.indexOf(b);
                return aIndex - bIndex;
            });
            
            const firstTs = sentenceTimestamps[0];
            const lastTs = sentenceTimestamps[sentenceTimestamps.length - 1];
            const sentence = {
                text: sentenceTimestamps.map(ts => ts.text || '').join(''),
                start: firstTs.begin_time || 0,
                end: lastTs.end_time || lastTs.begin_time || firstTs.begin_time || 0,
                timestamps: sentenceTimestamps,
                firstTimestamp: firstTs
            };
            
            // 去掉句子文本首尾的「」引号
            if (sentence.text) {
                let cleanedText = sentence.text.trim();
                if (cleanedText.startsWith('「') && cleanedText.endsWith('」')) {
                    cleanedText = cleanedText.slice(1, -1).trim();
                } else if (cleanedText.startsWith('「')) {
                    cleanedText = cleanedText.slice(1).trim();
                } else if (cleanedText.endsWith('」')) {
                    cleanedText = cleanedText.slice(0, -1).trim();
                }
                sentence.text = cleanedText;
            }
            
            sentences.push(sentence);
        });
        
        return sentences;
    }
    
    // 正常分组逻辑（根据标点符号）
    const sentences = [];
    let currentSentence = null;
    
    timestamps.forEach((ts, index) => {
        const text = ts.text || '';
        const start = ts.begin_time || 0;
        const end = ts.end_time || start;
        
        // 检查是否应该开始新句子
        // 1. 如果当前没有句子，开始新句子
        // 2. 如果前一个时间戳有句子结束标点符号（。！？\n），结束当前句子并开始新句子
        // 注意：我们只根据标点符号来分组，不考虑时间重叠，因为拖动时可能会产生时间重叠
        const shouldStartNewSentence = !currentSentence || 
            (index > 0 && timestamps[index - 1].text && timestamps[index - 1].text.match(/[。！？\n]/));
        
        if (shouldStartNewSentence && currentSentence) {
            // 结束当前句子
            if (currentSentence.firstTimestamp) {
                currentSentence.start = currentSentence.firstTimestamp.begin_time || 0;
            }
            sentences.push(currentSentence);
            currentSentence = null;
        }
        
        if (!currentSentence) {
            // 创建新句子，开始时间设置为首单词的 begin_time
            currentSentence = {
                text: text,
                start: start, // 首单词的 begin_time
                end: end,
                timestamps: [ts],
                firstTimestamp: ts // 保存首单词时间戳的引用
            };
        } else {
            currentSentence.text += text;
            currentSentence.end = end; // 更新结束时间为最后一个单词的 end_time
            currentSentence.timestamps.push(ts);
        }
        
        // 如果是最后一个时间戳，结束当前句子
        if (index === timestamps.length - 1) {
            if (currentSentence.firstTimestamp) {
                currentSentence.start = currentSentence.firstTimestamp.begin_time || 0;
            }
            sentences.push(currentSentence);
            currentSentence = null;
        }
    });
    
    // 去掉每个句子文本首尾的「」引号
    sentences.forEach(sentence => {
        if (sentence.text) {
            let cleanedText = sentence.text.trim();
            // 如果句子以「开头且以」结尾，去掉首尾的引号
            if (cleanedText.startsWith('「') && cleanedText.endsWith('」')) {
                cleanedText = cleanedText.slice(1, -1).trim();
            }
            // 如果句子以「开头但没有」结尾，只去掉开头的「
            else if (cleanedText.startsWith('「')) {
                cleanedText = cleanedText.slice(1).trim();
            }
            // 如果句子以」结尾但没有「开头，只去掉结尾的」
            else if (cleanedText.endsWith('」')) {
                cleanedText = cleanedText.slice(0, -1).trim();
            }
            sentence.text = cleanedText;
        }
    });
    
    // 如果句子边界信息尚未保存，保存它（只在第一次分组时保存，之后一直使用）
    if (!sentenceBoundaries || Object.keys(sentenceBoundaries).length === 0) {
        sentenceBoundaries = {};
        sentences.forEach((sentence, idx) => {
            if (sentence.timestamps && sentence.timestamps.length > 0) {
                // 保存时间戳引用数组，用于之后始终使用这个分组
                sentenceBoundaries[idx] = {
                    timestamps: [...sentence.timestamps] // 保存时间戳引用（深拷贝数组，但保留对象引用）
                };
            }
        });
        console.log('[groupTimestampsIntoSentences] 首次分组，已保存句子边界信息，句子数量:', Object.keys(sentenceBoundaries).length);
    }
    
    return sentences;
}

/**
 * 更新时间轴视图（根据缩放和滚动）
 */
function updateTimelineView() {
    const startTime = performance.now();
    const canvas = timelineEditorState.canvas;
    const duration = timelineEditorState.duration;
    if (!canvas || !duration) {
        console.warn('[updateTimelineView] canvas或duration无效');
        return;
    }
    
    // 计算视图时间范围
    const viewDuration = duration / timelineEditorState.zoomLevel;
    timelineEditorState.viewStartTime = Math.max(0, Math.min(
        timelineEditorState.scrollPosition,
        duration - viewDuration
    ));
    timelineEditorState.viewEndTime = timelineEditorState.viewStartTime + viewDuration;
    
    // 统计时间戳范围
    let timestampRangeStr = '无';
    if (currentTimestamps.length > 0) {
        const minTime = Math.min(...currentTimestamps.map(ts => ts.begin_time || 0)) / 1000;
        const maxTime = Math.max(...currentTimestamps.map(ts => ts.end_time || ts.begin_time || 0)) / 1000;
        timestampRangeStr = minTime.toFixed(3) + ' - ' + maxTime.toFixed(3);
    }
    
    console.log('[updateTimelineView] 开始重绘:', 
        '视图:', timelineEditorState.viewStartTime.toFixed(3), '-', timelineEditorState.viewEndTime.toFixed(3),
        '缩放:', timelineEditorState.zoomLevel.toFixed(2),
        '滚动:', timelineEditorState.scrollPosition.toFixed(3),
        '总时长:', duration.toFixed(3),
        '时间戳数:', currentTimestamps.length,
        '时间戳范围:', timestampRangeStr);
    
    // 重新绘制
    const ctx = canvas.getContext('2d');
    
    // 先清除整个canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制波形（必须在最底层，确保不被其他元素覆盖）
    const waveformStart = performance.now();
    if (timelineEditorState.audioBuffer) {
        console.log('[updateTimelineView] 开始绘制真实波形，audioBuffer存在，尺寸:', 
            timelineEditorState.audioBuffer.length, 'samples');
        drawWaveform(canvas, timelineEditorState.audioBuffer, duration);
        const waveformTime = performance.now() - waveformStart;
        console.log('[updateTimelineView] 波形绘制完成，耗时:', waveformTime.toFixed(2), 'ms');
        
        // 注意：波形验证在绘制后立即检查，此时句子块和时间刻度还未绘制
        // 所以这里只检查波形是否被绘制，不检查最终显示
    } else {
        console.log('[updateTimelineView] 开始绘制占位波形，audioBuffer不存在');
        drawPlaceholderWaveform(canvas, currentTimestamps, duration);
        console.log('[updateTimelineView] 占位波形绘制完成，耗时:', 
            (performance.now() - waveformStart).toFixed(2), 'ms');
    }
    
    // 绘制句子块（在波形上方，但不会覆盖波形区域）
    const blocksStart = performance.now();
    renderSentenceBlocks(canvas, currentTimestamps, duration);
    console.log('[updateTimelineView] 句子块绘制完成，耗时:', 
        (performance.now() - blocksStart).toFixed(2), 'ms');
    
    // 绘制时间刻度（在底部，不会覆盖波形）
    drawTimeScale(canvas, duration);
    
        // 验证波形是否仍然存在（调试用）
        if (timelineEditorState.audioBuffer) {
            // 检查波形区域是否有蓝色（在绘制完成后检查）
            const testX = Math.floor(canvas.width / 2);
            const testY = 50; // 波形中心区域
            const imageData = ctx.getImageData(testX, testY, 1, 1);
            const hasBlue = imageData.data[2] > 100;
            console.log('[updateTimelineView] 视图更新后，audioBuffer存在，波形验证:', 
                '颜色:', `rgba(${imageData.data[0]}, ${imageData.data[1]}, ${imageData.data[2]}, ${imageData.data[3]})`,
                '有蓝色:', hasBlue);
        } else {
            console.warn('[updateTimelineView] 视图更新后，audioBuffer不存在！');
        }
    
    // 重置播放头位置（因为整个视图已重绘）
    timelineEditorState.lastPlayheadX = -1;
    // 清除保存的背景数据（因为整个视图已重绘）
    timelineEditorState.savedBackgroundData = null;
    timelineEditorState.savedBackgroundX = -1;
    
    // 绘制播放头
    if (timelineEditorState.currentTime > 0) {
        redrawPlayhead();
    }
    
    const totalTime = performance.now() - startTime;
    console.log('[updateTimelineView] 视图更新完成，总耗时:', totalTime.toFixed(2), 'ms');
}

/**
 * 重绘播放头（优化性能，避免频繁重绘整个视图）
 */
function redrawPlayhead() {
    const canvas = timelineEditorState.canvas;
    const duration = timelineEditorState.duration;
    if (!canvas || !duration) return;
    
    const currentTime = timelineEditorState.currentTime;
    const viewStart = timelineEditorState.viewStartTime;
    const viewEnd = timelineEditorState.viewEndTime;
    
    // 如果播放头不在视图范围内，不需要绘制
    if (currentTime < viewStart || currentTime > viewEnd) {
        timelineEditorState.lastPlayheadX = -1;
        return;
    }
    
    const width = canvas.width;
    const viewDuration = viewEnd - viewStart;
    const newPlayheadX = ((currentTime - viewStart) / viewDuration) * width;
    
    // 这个函数现在主要用于非播放时的播放头绘制
    // 播放时的播放头更新已经在 updateProgress 中处理
    const ctx = canvas.getContext('2d');
    const height = canvas.height;
    
    // 清除旧播放头（如果存在）
    // 使用 getImageData/putImageData 来精确恢复背景
    if (timelineEditorState.lastPlayheadX >= 0 && 
        Math.abs(timelineEditorState.lastPlayheadX - newPlayheadX) > 1) {
        const oldX = Math.floor(timelineEditorState.lastPlayheadX);
        
        // 如果之前保存了背景图像数据，恢复它
        if (timelineEditorState.savedBackgroundData && 
            timelineEditorState.savedBackgroundX === oldX) {
            ctx.putImageData(timelineEditorState.savedBackgroundData, oldX - 1, 0);
            timelineEditorState.savedBackgroundData = null;
            timelineEditorState.savedBackgroundX = -1;
        } else {
            // 如果没有保存的背景，用背景色填充（fallback）
            ctx.save();
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(oldX - 1, 0, 3, height);
            ctx.restore();
        }
    }
    
    // 在绘制新播放头之前，保存该区域的背景图像数据
    const playheadWidth = 3;
    const saveX = Math.floor(newPlayheadX) - 1;
    if (saveX >= 0 && saveX + playheadWidth <= width) {
        timelineEditorState.savedBackgroundData = ctx.getImageData(
            saveX, 0, playheadWidth, height
        );
        timelineEditorState.savedBackgroundX = Math.floor(newPlayheadX);
    }
    
    // 绘制新播放头
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(newPlayheadX, 0);
    ctx.lineTo(newPlayheadX, height);
    ctx.stroke();
    ctx.restore();
    
    // 保存新位置
    timelineEditorState.lastPlayheadX = newPlayheadX;
}

/**
 * 处理句子块拖动（拖动一个句子时，后面的所有句子一起移动）
 */
function handleBlockDrag(e, blockData, canvas, duration) {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    // 计算拖动偏移
    const dragOffsetX = startX - blockData.startX;
    const originalStartTime = blockData.startTime;
    const originalEndTime = blockData.endTime;
    const originalDuration = originalEndTime - originalStartTime;
    
    // 记录拖动前的时间戳范围
    let beforeRange = '无';
    if (currentTimestamps.length > 0) {
        const minBefore = Math.min(...currentTimestamps.map(ts => ts.begin_time || 0)) / 1000;
        const maxBefore = Math.max(...currentTimestamps.map(ts => ts.end_time || ts.begin_time || 0)) / 1000;
        beforeRange = minBefore.toFixed(3) + ' - ' + maxBefore.toFixed(3);
    }
    
    console.log('[handleBlockDrag] 拖动开始:', 
        '原始时间:', originalStartTime.toFixed(3), '-', originalEndTime.toFixed(3),
        '持续时间:', originalDuration.toFixed(3),
        '时间戳数:', currentTimestamps.length,
        '拖动前时间戳范围:', beforeRange);
    
    // 找到对应的句子
    const sentenceIndex = sentenceBlocksData.findIndex(b => 
        b.startTime === blockData.startTime && b.endTime === blockData.endTime
    );
    
    if (sentenceIndex === -1) {
        console.error('[handleBlockDrag] 未找到对应的句子块');
        return;
    }
    
    // 获取所有句子（按时间排序）
    const allSentences = groupTimestampsIntoSentences(currentTimestamps);
    console.log('[handleBlockDrag] 分组后的句子数量:', allSentences.length);
    
    // 保存句子边界信息，用于在拖动时保持句子结构不变
    // 使用时间戳引用来保存，而不是索引，因为拖动时索引可能会改变
    sentenceBoundaries = {};
    allSentences.forEach((sentence, idx) => {
        if (sentence.timestamps && sentence.timestamps.length > 0) {
            // 保存时间戳引用数组，用于在拖动时重建句子
            sentenceBoundaries[idx] = {
                timestamps: [...sentence.timestamps] // 保存时间戳引用（深拷贝数组，但保留对象引用）
            };
        }
    });
    console.log('[handleBlockDrag] 已保存句子边界信息，句子数量:', Object.keys(sentenceBoundaries).length);
    
    // 找到当前拖动句子在allSentences中的索引
    const draggedSentence = sentenceBlocksData[sentenceIndex].sentence;
    const draggedSentenceIndex = allSentences.findIndex(s => {
        if (!s.timestamps || !draggedSentence.timestamps) return false;
        return s.timestamps[0] === draggedSentence.timestamps[0];
    });
    
    console.log('[handleBlockDrag] 拖动句子索引:', draggedSentenceIndex, 
        '总句子数:', allSentences.length,
        '拖动句子文本:', draggedSentence.text?.substring(0, 20));
    
    // 保存拖动句子的原始时间戳值（深拷贝）
    const draggedSentenceOriginalTimestamps = draggedSentence.timestamps ? 
        draggedSentence.timestamps.map(ts => ({
            begin_time: ts.begin_time || 0,
            end_time: ts.end_time || ts.begin_time || 0
        })) : [];
    const draggedSentenceOriginalFirstWordTime = draggedSentenceOriginalTimestamps.length > 0 ? 
        draggedSentenceOriginalTimestamps[0].begin_time : 0;
    
    // 保存所有后续句子的原始开始时间和所有时间戳的原始值
    const subsequentSentences = [];
    if (draggedSentenceIndex >= 0) {
        for (let i = draggedSentenceIndex + 1; i < allSentences.length; i++) {
            const s = allSentences[i];
            if (s.timestamps && s.timestamps.length > 0) {
                const firstTs = s.timestamps[0];
                const originalStart = (firstTs.begin_time || 0) / 1000; // 转换为秒
                const originalFirstWordTime = firstTs.begin_time || 0; // 毫秒
                
                // 保存所有时间戳的原始值（深拷贝）
                const originalTimestamps = s.timestamps.map(ts => ({
                    begin_time: ts.begin_time || 0,
                    end_time: ts.end_time || ts.begin_time || 0
                }));
                
                // 保存最后一个时间戳的原始结束时间
                const lastOriginalTs = originalTimestamps[originalTimestamps.length - 1];
                const originalEndTime = (lastOriginalTs.end_time || lastOriginalTs.begin_time || 0) / 1000; // 转换为秒
                
                subsequentSentences.push({
                    sentence: s,
                    originalStart: originalStart,
                    originalFirstWordTime: originalFirstWordTime,
                    originalEndTime: originalEndTime,
                    originalTimestamps: originalTimestamps
                });
            }
        }
    }
    
    console.log('[handleBlockDrag] 后续句子数量:', subsequentSentences.length);
    
    const onMouseMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - dragOffsetX;
        
        // 将像素位置转换为时间
        const viewStart = timelineEditorState.viewStartTime;
        const viewEnd = timelineEditorState.viewEndTime;
        const viewDuration = viewEnd - viewStart;
        const timePerPixel = viewDuration / canvas.width;
        let newStartTime = Math.max(0, Math.min(
            duration - originalDuration,
            viewStart + (x * timePerPixel)
        ));
        
        // 只进行基本的范围检查：确保拖动句子本身不会超出音频时长
        // 允许时间重叠，将权限交给用户
        const absoluteTimeOffset = (newStartTime - originalStartTime) * 1000; // 毫秒
        
        // 基本检查：确保拖动句子本身不会超出音频时长
        // 允许后续句子超出或重叠，由用户决定
        const maxTime = duration * 1000; // 毫秒
        const draggedSentenceNewEnd = (originalEndTime * 1000) + absoluteTimeOffset;
        
        // 如果拖动句子会超出音频时长，限制其位置
        if (draggedSentenceNewEnd > maxTime) {
            newStartTime = Math.max(0, (maxTime - (originalDuration * 1000)) / 1000);
            console.log('[handleBlockDrag] 拖动句子超出音频时长，已限制位置:', newStartTime.toFixed(3));
        }
        
        // 重新计算偏移（可能已被限制）
        const finalAbsoluteTimeOffset = (newStartTime - originalStartTime) * 1000;
        
        // 移除后续句子的限制检查，允许重叠和超出
        // 后续句子会跟随拖动句子移动相同的偏移量，即使会导致重叠或超出音频时长
        // 不再进行任何限制检查，将权限交给用户
        // 使用 finalAbsoluteTimeOffset 作为后续句子的偏移量
        
        const newEndTime = newStartTime + originalDuration;
        
        // 计算时间偏移量（基于首单词的原始时间）
        const sentence = sentenceBlocksData[sentenceIndex].sentence;
        if (sentence && sentence.timestamps && sentence.timestamps.length > 0) {
            const timeOffset = (newStartTime * 1000) - draggedSentenceOriginalFirstWordTime;
            
            // 更新当前拖动句子的所有时间戳（使用保存的原始时间戳值）
            sentence.timestamps.forEach((ts, tsIdx) => {
                // 使用保存的原始时间戳值，而不是已经被修改过的值
                const originalTs = draggedSentenceOriginalTimestamps[tsIdx];
                if (!originalTs) {
                    console.error('[handleBlockDrag] 错误：原始时间戳不存在！', 
                        '索引:', tsIdx,
                        '时间戳数组长度:', draggedSentenceOriginalTimestamps.length,
                        '句子时间戳长度:', sentence.timestamps.length);
                    return; // 跳过这个时间戳
                }
                
                const originalBegin = originalTs.begin_time || 0;
                const originalEnd = originalTs.end_time || originalBegin;
                const newBegin = originalBegin + timeOffset;
                const newEnd = originalEnd + timeOffset;
                
                // 允许时间戳超出范围或重叠，将权限交给用户
                // 只在最后检查时记录警告，不阻止
                const maxTime = duration * 1000;
                if (newBegin < 0 || newBegin > maxTime || newEnd < 0 || newEnd > maxTime) {
                    console.log('[handleBlockDrag] 拖动句子时间戳超出范围（这是允许的）:', 
                        '原始:', originalBegin, '-', originalEnd,
                        '新值:', newBegin, '-', newEnd,
                        '偏移:', timeOffset,
                        '音频时长:', maxTime);
                }
                
                ts.begin_time = newBegin;
                ts.end_time = newEnd;
            });
            
            // 更新句子的开始和结束时间
            if (sentence.timestamps.length > 0) {
                sentence.start = sentence.timestamps[0].begin_time || 0;
                const lastTs = sentence.timestamps[sentence.timestamps.length - 1];
                sentence.end = lastTs.end_time || lastTs.begin_time || sentence.start;
            }
            
            // 更新首单词时间戳引用
            if (sentence.firstTimestamp) {
                sentence.firstTimestamp = sentence.timestamps[0];
            }
            
            // 计算拖动句子的绝对时间偏移（所有后续句子移动相同的偏移量）
            const absoluteTimeOffset = (newStartTime - originalStartTime) * 1000; // 毫秒
            
            // 更新所有后续句子的时间戳（所有后续句子移动相同的绝对时间偏移）
            subsequentSentences.forEach(({ sentence: subSentence, originalStart, originalFirstWordTime, originalTimestamps }, subIdx) => {
                if (subSentence.timestamps && subSentence.timestamps.length > 0) {
                    // 后续句子移动相同的绝对时间偏移
                    // 允许超出范围或重叠，将权限交给用户
                    const newSubStartTime = originalStart * 1000 + absoluteTimeOffset;
                    const maxTime = duration * 1000;
                    
                    // 不再限制后续句子的时间戳范围，允许超出或重叠
                    // 只在最后检查时记录警告，不阻止
                    if (newSubStartTime < 0 || newSubStartTime > maxTime) {
                        console.log('[handleBlockDrag] 后续句子新开始时间超出范围（这是允许的）:', 
                            '原始开始:', originalStart.toFixed(3),
                            '绝对偏移:', absoluteTimeOffset.toFixed(0), 'ms',
                            '新开始时间:', (newSubStartTime / 1000).toFixed(3),
                            '音频时长:', (maxTime / 1000).toFixed(3));
                    }
                    
                    const subTimeOffset = newSubStartTime - originalFirstWordTime;
                    
                    // 记录更新前的状态（仅前3个）
                    if (subIdx < 3) {
                        console.log('[handleBlockDrag] 更新后续句子:', 
                            '索引:', subIdx,
                            '原始开始:', originalStart.toFixed(3),
                            '绝对偏移:', absoluteTimeOffset.toFixed(0), 'ms',
                            '新开始时间:', (newSubStartTime / 1000).toFixed(3),
                            '时间偏移:', subTimeOffset.toFixed(0), 'ms',
                            '文本:', subSentence.text?.substring(0, 20));
                    }
                    
                    // 更新后续句子的所有时间戳（使用保存的原始时间戳值）
                    subSentence.timestamps.forEach((ts, tsIdx) => {
                        // 使用保存的原始时间戳值，而不是已经被修改过的值
                        const originalTs = originalTimestamps[tsIdx];
                        if (!originalTs) {
                            console.error('[handleBlockDrag] 错误：后续句子原始时间戳不存在！', 
                                '句子索引:', subIdx,
                                '时间戳索引:', tsIdx,
                                '原始时间戳数组长度:', originalTimestamps.length,
                                '句子时间戳长度:', subSentence.timestamps.length);
                            return; // 跳过这个时间戳
                        }
                        
                        const originalBegin = originalTs.begin_time || 0;
                        const originalEnd = originalTs.end_time || originalBegin;
                        const newBegin = originalBegin + subTimeOffset;
                        const newEnd = originalEnd + subTimeOffset;
                        
                        // 允许时间戳超出范围或重叠，将权限交给用户
                        // 只在最后检查时记录警告，不阻止
                        const maxTime = duration * 1000;
                        if (newBegin < 0 || newBegin > maxTime || newEnd < 0 || newEnd > maxTime) {
                            console.log('[handleBlockDrag] 后续句子时间戳超出范围（这是允许的）:', 
                                '句子索引:', subIdx,
                                '原始:', originalBegin, '-', originalEnd,
                                '新值:', newBegin, '-', newEnd,
                                '偏移:', subTimeOffset,
                                '音频时长:', maxTime);
                        }
                        
                        ts.begin_time = newBegin;
                        ts.end_time = newEnd;
                    });
                    
                    // 更新后续句子的开始和结束时间
                    if (subSentence.timestamps.length > 0) {
                        subSentence.start = subSentence.timestamps[0].begin_time || 0;
                        const lastTs = subSentence.timestamps[subSentence.timestamps.length - 1];
                        subSentence.end = lastTs.end_time || lastTs.begin_time || subSentence.start;
                    }
                    
                    // 更新后续句子的首单词时间戳引用
                    if (subSentence.firstTimestamp) {
                        subSentence.firstTimestamp = subSentence.timestamps[0];
                    }
                }
            });
        }
        
        // 注意：由于我们直接修改了时间戳对象的引用（通过 sentence.timestamps），
        // currentTimestamps 中的对象应该已经更新了
        // 但是为了确保数据一致性，我们按时间顺序重新排序 currentTimestamps
        // 这样可以确保在重新分组时，句子能够正确分组
        
        // 按 begin_time 排序 currentTimestamps（确保顺序正确）
        currentTimestamps.sort((a, b) => {
            return (a.begin_time || 0) - (b.begin_time || 0);
        });
        
        // 验证时间戳数据（允许超出范围，将权限交给用户）
        // maxTime 已在上面声明，这里直接使用
        let invalidCount = 0;
        currentTimestamps.forEach(ts => {
            const originalBegin = ts.begin_time || 0;
            const originalEnd = ts.end_time || originalBegin;
            
            if (originalBegin < 0 || originalBegin > maxTime || originalEnd < 0 || originalEnd > maxTime) {
                invalidCount++;
                console.error('[handleBlockDrag] 发现无效时间戳:', {
                    text: ts.text,
                    begin_time: originalBegin,
                    end_time: originalEnd,
                    maxTime: maxTime
                });
            }
        });
        
        if (invalidCount > 0) {
            console.error('[handleBlockDrag] 警告：发现', invalidCount, '个无效时间戳，这不应该发生！');
        }
        
        // 统计时间戳范围
        const minTime = Math.min(...currentTimestamps.map(ts => ts.begin_time || 0));
        const maxTimeActual = Math.max(...currentTimestamps.map(ts => ts.end_time || ts.begin_time || 0));
        
        console.log('[handleBlockDrag] 拖动后，时间戳已更新并排序:', 
            '数量:', currentTimestamps.length,
            '范围:', (minTime / 1000).toFixed(3), '-', (maxTimeActual / 1000).toFixed(3),
            '音频时长:', duration.toFixed(3),
            '无效数量:', invalidCount);
        
        // 调整视图位置，确保被拖动的句子在视图范围内
        const draggedSentenceEndTime = (sentence.timestamps[sentence.timestamps.length - 1]?.end_time || sentence.end || 0) / 1000;
        const viewDurationForScroll = duration / timelineEditorState.zoomLevel;
        // viewStart 和 viewEnd 已在上面声明，这里直接使用
        
        // 如果被拖动的句子不在视图范围内，调整视图位置
        if (newStartTime < viewStart || draggedSentenceEndTime > viewEnd) {
            // 将视图中心对准被拖动句子的中心
            const sentenceCenter = (newStartTime + draggedSentenceEndTime) / 2;
            timelineEditorState.scrollPosition = Math.max(0, Math.min(
                duration - viewDurationForScroll,
                sentenceCenter - viewDurationForScroll / 2
            ));
            console.log('[handleBlockDrag] 调整视图位置，使被拖动句子可见:', 
                '句子中心:', sentenceCenter.toFixed(3),
                '新滚动位置:', timelineEditorState.scrollPosition.toFixed(3));
        }
        
        // 重新渲染（会重新分组句子并绘制）
        updateTimelineView();
    };
    
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        timelineEditorState.draggedBlock = null;
        // 不清除句子边界信息，保持句子结构不变
        // 最后检查一下时间戳是否有问题（仅记录警告，不阻止）
        const maxTime = duration * 1000;
        let invalidCount = 0;
        let overlapWarnings = [];
        
        currentTimestamps.forEach((ts, idx) => {
            const begin = ts.begin_time || 0;
            const end = ts.end_time || begin;
            
            // 检查是否超出范围
            if (begin < 0 || begin > maxTime || end < 0 || end > maxTime) {
                invalidCount++;
            }
            
            // 检查时间戳顺序（允许重叠，但记录警告）
            if (idx > 0) {
                const prevTs = currentTimestamps[idx - 1];
                const prevEnd = prevTs.end_time || prevTs.begin_time || 0;
                if (begin < prevEnd) {
                    overlapWarnings.push({
                        index: idx,
                        text: ts.text,
                        begin: begin,
                        prevEnd: prevEnd
                    });
                }
            }
        });
        
        if (invalidCount > 0) {
            console.warn('[handleBlockDrag] 拖动结束检查：发现', invalidCount, '个时间戳超出范围');
        }
        if (overlapWarnings.length > 0) {
            console.log('[handleBlockDrag] 拖动结束检查：发现', overlapWarnings.length, '处时间戳重叠（这是允许的）');
        }
        console.log('[handleBlockDrag] 拖动结束，句子边界信息保持不变');
    };
    
    timelineEditorState.draggedBlock = { index: sentenceIndex };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

/**
 * 从句子数据更新当前时间戳
 * 注意：由于我们直接修改了时间戳对象的引用，currentTimestamps 应该已经更新
 * 这个函数主要用于确保数据同步，或者从句子对象重新构建时间戳数组
 */
function updateCurrentTimestampsFromSentences() {
    // 由于拖动时我们直接修改了 currentTimestamps 中的时间戳对象（通过引用）
    // 所以 currentTimestamps 应该已经是最新的
    // 但是为了确保数据一致性，我们从 currentTimestamps 重新分组句子
    // 然后按顺序重新构建时间戳数组
    
    // 重新分组句子（使用更新后的 currentTimestamps）
    const sentences = groupTimestampsIntoSentences(currentTimestamps);
    
    // 按时间顺序重新构建时间戳数组
    const newTimestamps = [];
    sentences.forEach(sentence => {
        if (sentence.timestamps && sentence.timestamps.length > 0) {
            // 按 begin_time 排序时间戳（确保顺序正确）
            const sortedTimestamps = [...sentence.timestamps].sort((a, b) => {
                return (a.begin_time || 0) - (b.begin_time || 0);
            });
            newTimestamps.push(...sortedTimestamps);
        }
    });
    
    // 更新 currentTimestamps（保持引用，但确保顺序正确）
    if (newTimestamps.length > 0) {
        // 清空并重新填充，保持数组引用
        currentTimestamps.length = 0;
        currentTimestamps.push(...newTimestamps);
    }
    
    console.log('[updateCurrentTimestampsFromSentences] 更新时间戳数组，数量:', currentTimestamps.length);
}

/**
 * 更新播放头位置（已废弃，使用 redrawPlayhead 代替）
 */
function updatePlayheadPosition(canvas, currentTime, duration) {
    // 直接调用 redrawPlayhead，它会处理清除和重绘
    redrawPlayhead();
}

/**
 * 格式化时间显示
 */
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 在文件末尾确保所有函数都在全局作用域中可用
(function() {
    if (typeof window !== 'undefined') {
        // 挂载主要函数到 window 对象
        window.renderInteractiveSentence = renderInteractiveSentence;
        window.attachAudioEventListeners = attachAudioEventListeners;
        
        console.log('[webview_interactive_player] 函数已挂载到window对象:', {
            renderInteractiveSentence: typeof window.renderInteractiveSentence,
            attachAudioEventListeners: typeof window.attachAudioEventListeners
        });
    }
})();
