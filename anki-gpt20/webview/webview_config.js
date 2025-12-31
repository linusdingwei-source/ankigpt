// webview_config.js - 配置管理模块

/**
 * 填充动态列表（牌组和卡片类型）
 */
function populateDynamicLists(decks, noteTypes) {
    const deckList = document.getElementById('deckOptions');
    if (deckList) {
        deckList.innerHTML = '';
        decks.forEach(deck => deckList.appendChild(new Option(deck)));
    }
    const cardTypeSelects = [
        document.getElementById('cardType'),
        document.getElementById('asrCardType'),
        document.getElementById('settingsDefaultCardType')
    ];
    cardTypeSelects.forEach(select => {
        if (select) {
            select.innerHTML = '';
            noteTypes.forEach(nt => select.appendChild(new Option(nt, nt)));
        }
    });
}

/**
 * 将配置加载到表单中
 */
function loadConfigIntoForms(config) {
    document.getElementById('cardType').value = config.default_card_type;
    document.getElementById('deckName').value = config.last_used_deck || config.default_deck_name;
    document.getElementById('includePronunciation').checked = config.interactive_player_enabled;
    // ASR tab的配置
    const asrCardType = document.getElementById('asrCardType');
    const asrDeckName = document.getElementById('asrDeckName');
    if (asrCardType) asrCardType.value = config.default_card_type;
    if (asrDeckName) asrDeckName.value = config.last_used_deck || config.default_deck_name;
    document.getElementById('settingsApiKey').value = config.dashscope_api_key || '';
    document.getElementById('settingsDefaultCardType').value = config.default_card_type;
    document.getElementById('settingsDefaultDeckName').value = config.default_deck_name;
    document.getElementById('settingsInteractivePlayer').checked = config.interactive_player_enabled;
    document.getElementById('settingsTtsProvider').value = config.tts_provider;
    
    // 加载 Qwen-TTS 配置
    if (config.qwen_tts_options) {
        const qwenModel = document.getElementById('settingsQwenModel');
        const qwenVoice = document.getElementById('settingsQwenVoice');
        const qwenLanguage = document.getElementById('settingsQwenLanguage');
        if (qwenModel) qwenModel.value = config.qwen_tts_options.model || 'qwen3-tts-flash';
        if (qwenVoice) qwenVoice.value = config.qwen_tts_options.voice || 'Cherry';
        if (qwenLanguage) qwenLanguage.value = config.qwen_tts_options.language_type || 'Japanese';
    }
    
    // 加载 CosyVoice 配置
    if (config.cosyvoice_tts_options) {
        const cosyvoiceModel = document.getElementById('settingsCosyvoiceModel');
        const cosyvoiceVoice = document.getElementById('settingsCosyvoiceVoice');
        if (cosyvoiceModel) cosyvoiceModel.value = config.cosyvoice_tts_options.model || 'cosyvoice-v2';
        if (cosyvoiceVoice) cosyvoiceVoice.value = config.cosyvoice_tts_options.voice || 'loongyuuna_v2';
    } else {
        // 如果没有配置，使用默认值
        const cosyvoiceModel = document.getElementById('settingsCosyvoiceModel');
        const cosyvoiceVoice = document.getElementById('settingsCosyvoiceVoice');
        if (cosyvoiceModel) cosyvoiceModel.value = 'cosyvoice-v2';
        if (cosyvoiceVoice) cosyvoiceVoice.value = 'loongyuuna_v2';
    }
    
    // 加载 SSML 配置
    if (config.ssml_options) {
        document.getElementById('settingsSsmlEnabled').checked = config.ssml_options.enabled;
        document.getElementById('settingsSsmlRules').value = JSON.stringify(config.ssml_options.rules, null, 2);
    }
    
    // 触发 TTS 提供者切换事件，确保界面状态正确
    const ttsProviderSelect = document.getElementById('settingsTtsProvider');
    if (ttsProviderSelect) {
        ttsProviderSelect.dispatchEvent(new Event('change'));
    }
}

/**
 * 收集设置数据
 */
function collectSettingsData() {
    const newConfig = { ...window.ankiGptConfig };
    newConfig.dashscope_api_key = getInputValue('settingsApiKey');
    newConfig.default_card_type = getInputValue('settingsDefaultCardType');
    newConfig.default_deck_name = getInputValue('settingsDefaultDeckName');
    newConfig.interactive_player_enabled = getCheckboxValue('settingsInteractivePlayer');
    newConfig.tts_provider = getInputValue('settingsTtsProvider');
    
    // 保存 Qwen-TTS 配置
    if (!newConfig.qwen_tts_options) newConfig.qwen_tts_options = {};
    newConfig.qwen_tts_options.model = getInputValue('settingsQwenModel');
    newConfig.qwen_tts_options.voice = getInputValue('settingsQwenVoice');
    newConfig.qwen_tts_options.language_type = getInputValue('settingsQwenLanguage');
    
    // 保存 CosyVoice 配置
    if (!newConfig.cosyvoice_tts_options) newConfig.cosyvoice_tts_options = {};
    newConfig.cosyvoice_tts_options.model = getInputValue('settingsCosyvoiceModel');
    newConfig.cosyvoice_tts_options.voice = getInputValue('settingsCosyvoiceVoice');
    
    // 保存 SSML 配置（仅 CosyVoice 支持）
    if (!newConfig.ssml_options) newConfig.ssml_options = {};
    const ttsProvider = newConfig.tts_provider;
    if (ttsProvider === 'cosyvoice-v2') {
        // CosyVoice 支持 SSML
        newConfig.ssml_options.enabled = getCheckboxValue('settingsSsmlEnabled');
        try {
            newConfig.ssml_options.rules = JSON.parse(getInputValue('settingsSsmlRules'));
        } catch (e) {
            if (typeof window.displayTemporaryMessage === 'function') {
                window.displayTemporaryMessage('SSML 规则 JSON 格式错误，该项未保存！', 'red', 5000);
            }
            newConfig.ssml_options.rules = window.ankiGptConfig.ssml_options?.rules || {};
        }
    } else {
        // Qwen-TTS 不支持 SSML，禁用 SSML
        newConfig.ssml_options.enabled = false;
        newConfig.ssml_options.rules = window.ankiGptConfig.ssml_options?.rules || {};
    }
    return newConfig;
}

