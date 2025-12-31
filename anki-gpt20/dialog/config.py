# dialog/config.py - 配置管理

import logging
from typing import Dict, Any
from aqt import mw
from ..consts import ADDON_NAME, SUPPORTED_CARD_TYPES

logger = logging.getLogger(ADDON_NAME)


class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    def ensure_default_config(self) -> None:
        """
        确保配置字典中包含所有必要的键值，并验证配置的有效性
        
        如果配置项缺失或无效，将使用默认值替换
        """
        defaults = {
            'dashscope_api_key': '',
            'default_card_type': '问答题（附翻转卡片）',
            'default_deck_name': 'Default',
            'interactive_player_enabled': True,
            'tts_provider': 'cosyvoice-v2',
            'qwen_tts_options': {
                "model": "qwen3-tts-flash",
                "voice": "Cherry",
                "language_type": "Japanese"
            },
            'cosyvoice_tts_options': {
                "model": "cosyvoice-v2",
                "voice": "loongyuuna_v2"
            },
            'ssml_options': {
                "enabled": False,
                "rules": {"\n": "1000ms"}
            }
        }
        for key, value in defaults.items():
            self.config.setdefault(key, value)
        self.config.setdefault('last_used_deck', self.config['default_deck_name'])
        
        # 验证配置有效性
        self._validate_config(defaults)
        
        mw.addonManager.writeConfig(ADDON_NAME, self.config)
    
    def _validate_config(self, defaults: Dict[str, Any]) -> None:
        """
        验证配置的有效性
        
        检查关键配置项是否符合要求，如果不符合则使用默认值
        
        Args:
            defaults: 默认配置字典
        """
        # 验证卡片类型是否支持
        default_card_type = self.config.get('default_card_type', '')
        if default_card_type not in SUPPORTED_CARD_TYPES:
            logger.warning(f"Unsupported card type '{default_card_type}', using default.")
            self.config['default_card_type'] = '问答题（附翻转卡片）'
        
        # 验证 TTS 提供者
        tts_provider = self.config.get('tts_provider', '')
        valid_tts_providers = ['qwen-tts', 'cosyvoice-v2', 'cosyvoice']  # 兼容旧配置
        if tts_provider not in valid_tts_providers:
            logger.warning(f"Invalid TTS provider '{tts_provider}', using default.")
            self.config['tts_provider'] = 'cosyvoice-v2'
        # 兼容旧配置：将 'cosyvoice' 转换为 'cosyvoice-v2'
        if tts_provider == 'cosyvoice':
            logger.info("Converting legacy 'cosyvoice' provider to 'cosyvoice-v2'")
            self.config['tts_provider'] = 'cosyvoice-v2'
        
        # 验证 qwen_tts_options 结构
        qwen_options = self.config.get('qwen_tts_options', {})
        if not isinstance(qwen_options, dict):
            logger.warning("Invalid qwen_tts_options structure, using defaults.")
            self.config['qwen_tts_options'] = defaults['qwen_tts_options']
        
        # 验证 ssml_options 结构
        ssml_options = self.config.get('ssml_options', {})
        if not isinstance(ssml_options, dict):
            logger.warning("Invalid ssml_options structure, using defaults.")
            self.config['ssml_options'] = defaults['ssml_options']
        elif 'enabled' not in ssml_options:
            ssml_options['enabled'] = False
        elif 'rules' not in ssml_options:
            ssml_options['rules'] = {}
    
    def save_config(self, new_config: Dict[str, Any]) -> None:
        """
        保存配置到 Anki 配置管理器
        
        Args:
            new_config: 新的配置字典
        """
        logger.info("Received new config from webview. Saving...")
        self.config.update(new_config)
        mw.addonManager.writeConfig(ADDON_NAME, self.config)
        logger.info("Config saved successfully.")

