# dialog/session_history.py - 会话历史管理

import logging
from typing import List, Dict, Any
from aqt import mw
from ..consts import ADDON_NAME

logger = logging.getLogger(ADDON_NAME)


class SessionHistoryManager:
    """会话历史管理器"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    def get_session_history(self, history_type: str = 'generator') -> List[Dict[str, Any]]:
        """
        获取会话历史记录
        
        Args:
            history_type: 历史类型，'generator' 或 'asr'
        
        Returns:
            会话历史记录列表（最多50条）
        """
        key = f'session_history_{history_type}'
        history = self.config.get(key, [])
        # 限制最多50条
        if len(history) > 50:
            history = history[:50]
        return history
    
    def save_session_history(self, history_type: str, history: List[Dict[str, Any]]) -> None:
        """
        保存会话历史记录
        
        Args:
            history_type: 历史类型，'generator' 或 'asr'
            history: 会话历史记录列表（最多50条）
        """
        # 限制最多50条
        if len(history) > 50:
            history = history[:50]
        key = f'session_history_{history_type}'
        self.config[key] = history
        mw.addonManager.writeConfig(ADDON_NAME, self.config)
        logger.debug(f"[save_session_history] 已保存 {len(history)} 条{history_type}会话历史")
    
    def delete_session_history(self, history_type: str, history_id: str) -> None:
        """
        删除会话历史记录
        
        Args:
            history_type: 历史类型，'generator' 或 'asr'
            history_id: 要删除的历史记录ID
        """
        history = self.get_session_history(history_type)
        history = [item for item in history if item.get('historyId') != history_id]
        self.save_session_history(history_type, history)
        logger.info(f"[delete_session_history] 已删除{history_type}会话历史记录: {history_id}")

