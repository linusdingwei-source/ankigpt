# dialog/dialog.py - 主对话框类

import os
import json
import logging
from typing import Dict, Any
from PyQt6.QtCore import QUrl
from PyQt6.QtWidgets import QVBoxLayout, QDialog
from aqt import mw
from aqt.webview import AnkiWebView
from ..consts import ADDON_NAME
from .config import ConfigManager
from .session_history import SessionHistoryManager
from .generator_handler import GeneratorHandler
from .asr_handler import ASRHandler
from .card_manager import CardManager
from .deck_browser import DeckBrowserHandler
from .utils import get_deck_names, get_note_type_names

logger = logging.getLogger(ADDON_NAME)
# 获取插件根目录（dialog的父目录）
addon_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class AnkiGPTWebViewDialog(QDialog):
    """Anki-GPT 主对话框类"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Anki-GPT")
        self.setMinimumSize(1200, 800)
        self.resize(1400, 900)
        self.config = mw.addonManager.getConfig(ADDON_NAME)
        
        # 初始化各个功能模块
        self.config_manager = ConfigManager(self.config)
        self.config_manager.ensure_default_config()
        
        self.session_history_manager = SessionHistoryManager(self.config)
        self.generator_handler = GeneratorHandler(self.config, None)  # webview稍后设置
        self.asr_handler = ASRHandler(self.config, None)  # webview稍后设置
        self.card_manager = CardManager(self.config, None)  # webview稍后设置
        self.deck_browser_handler = DeckBrowserHandler(self.config, None)  # webview稍后设置
        
        self.setup_webview_ui()
        
        # 设置webview引用到各个处理器
        self.generator_handler.webview = self.webview
        self.asr_handler.webview = self.webview
        self.card_manager.webview = self.webview
        self.deck_browser_handler.webview = self.webview
        
        logger.info(f"[{ADDON_NAME}] Dialog initialized.")

    def setup_webview_ui(self):
        """设置WebView UI"""
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        self.webview = AnkiWebView(self)
        main_layout.addWidget(self.webview)
        self.webview.set_bridge_command(self._on_js_command, context=self)
        self.webview.page().loadFinished.connect(self._on_page_load_finished)
        self.webview.set_open_links_externally(False)
        try:
            html_url = f"http://127.0.0.1:{mw.mediaServer.getPort()}/_addons/{ADDON_NAME}/webview/webview_ui.html"
            self.webview.load_url(QUrl(html_url))
        except Exception as e:
            logger.error(f"Failed to construct media server URL: {e}. Falling back to local file.")
            html_file_path = os.path.join(addon_dir, "webview", "webview_ui.html")
            self.webview.load_url(QUrl.fromLocalFile(html_file_path))

    def _on_page_load_finished(self, success: bool) -> None:
        """
        页面加载完成后的回调函数
        
        Args:
            success: 页面是否成功加载
        """
        if not success:
            logger.error("WebView page failed to load.")
            return
        logger.debug("Page loaded. Sending initial data to webview.")
        decks = get_deck_names()
        note_types = get_note_type_names()
        self.webview.eval(f"""
            if (typeof window.initializeUI === 'function') {{
                window.initializeUI({json.dumps(self.config)}, {json.dumps(decks)}, {json.dumps(note_types)});
            }} else {{
                console.error('initializeUI function not found!');
            }}
            // 加载会话历史
            // 会话历史功能已移除，改为直接显示牌组卡片
        """)
        self.webview.eval("setLoading(false);")

    def _on_js_command(self, command: str) -> None:
        """
        处理从 WebView 发送过来的命令
        
        Args:
            command: 命令字符串，格式为 "command::[args]"
        """
        logger.info(f"[_on_js_command] 收到命令: {command[:100]}...")  # 只记录前100个字符
        parts = command.split("::", 1)
        cmd, args_str = parts[0], parts[1] if len(parts) > 1 else "[]"
        logger.debug(f"[_on_js_command] 解析命令: cmd={cmd}, args_str长度={len(args_str)}")
        try:
            args = json.loads(args_str)
            logger.debug(f"[_on_js_command] JSON解析成功: args={args}")
        except json.JSONDecodeError as e:
            logger.error(f"[_on_js_command] Failed to decode JSON from JS: {args_str}, error: {e}")
            return
        
        # 命令路由表
        actions: Dict[str, Any] = {
            "generate_preview": self.generator_handler.generate_preview,
            "add_to_anki": self.card_manager.add_to_anki,
            "split_and_generate_cards": self.generator_handler.split_and_generate_cards,
            "save_config": self._save_config,
            "fetch_deck_cards": self.deck_browser_handler.fetch_deck_cards,
            "fetch_card_details": self.deck_browser_handler.fetch_card_details,
            "asr_transcribe": self.asr_handler.asr_transcribe,
            "delete_deck_card": self.deck_browser_handler.delete_deck_card,
            "edit_deck_card": self.deck_browser_handler.edit_deck_card,
        }
        
        if cmd in actions:
            logger.info(f"[_on_js_command] 执行命令: {cmd}")
            try:
                # save_config 需要整个字典作为参数，其他命令展开参数列表
                if isinstance(args, list) and cmd not in ["save_config"]:
                    actions[cmd](*args)
                else:
                    actions[cmd](args)
                logger.info(f"[_on_js_command] 命令 {cmd} 执行完成")
            except Exception as e:
                logger.exception(f"[_on_js_command] 执行命令 {cmd} 时发生异常: {e}")
        else:
            logger.warning(f"[_on_js_command] Unhandled JS command: {cmd}")

    def _save_config(self, new_config: Dict[str, Any]) -> None:
        """
        保存配置到 Anki 配置管理器
        
        Args:
            new_config: 新的配置字典
        """
        self.config_manager.save_config(new_config)
        self.webview.eval("displayTemporaryMessage('设置已保存！', 'green', 3000);")


