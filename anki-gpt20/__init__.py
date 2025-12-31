# anki-gpt20/__init__.py
# -*- coding: utf-8 -*-
# Copyright: Ankitects Pty Ltd and contributors
# License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import os
import sys
import logging # 提前导入 logging，以便在 sys.path 修改后立即使用

# --- CRITICAL: sys.path modification MUST be在这里，在任何本地模块导入之前 ---
# 获取当前插件的目录
addon_path = os.path.dirname(__file__)
# 将 lib 目录添加到 sys.path
lib_path = os.path.join(addon_path, "lib")
if lib_path not in sys.path:
    sys.path.insert(0, lib_path)
    # 注意：此时 logger 可能还未完全配置，所以这里使用 print 或临时 logger
    # 稍后会用配置好的 logger 再次记录
    # print(f"Added '{lib_path}' to sys.path for addon '{os.path.basename(addon_path)}'.")
# --- END CRITICAL BLOCK ---

# 现在可以导入 ADDON_NAME，因为它是一个本地模块，不依赖 lib 目录
from .consts import ADDON_NAME

# 配置日志 (现在 ADDON_NAME 已可用)
if not logging.root.handlers:
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(ADDON_NAME)
logger.debug(f"[{ADDON_NAME}.__init__] Added '{lib_path}' to sys.path.") # 现在这个日志会正常工作

# 现在导入其他可能依赖 lib 目录的模块
from PyQt6.QtGui import QAction
from aqt import mw
from aqt.gui_hooks import main_window_did_init
from aqt.utils import showInfo
from .dialog import AnkiGPTWebViewDialog # 这个导入链现在应该能找到 dashscope

# 注册 Web Exports for the media server
mw.addonManager.setWebExports(ADDON_NAME, r".*\.(html|js|css)")
logger.debug(f"[{ADDON_NAME}.__init__] Registered web exports for pattern: r'.*\\.(html|js|css)'")

def show_anki_gpt_dialog():
    """显示 Anki-GPT 对话框"""
    logger.info(f"[{ADDON_NAME}.__init__] 尝试显示 Anki-GPT 对话框。")
    if not mw.col:
        showInfo("请先打开一个牌组。")
        return
    dialog = AnkiGPTWebViewDialog(mw)
    dialog.exec()
    logger.info(f"[{ADDON_NAME}.__init__] Anki-GPT 对话框已关闭。")

def add_menu_item():
    """在 Anki 工具菜单中添加一个项"""
    logger.info(f"[{ADDON_NAME}.__init__] 添加菜单项 '{ADDON_NAME}'。")
    action = QAction(ADDON_NAME, mw)
    action.triggered.connect(show_anki_gpt_dialog)
    mw.form.menuTools.addAction(action)

main_window_did_init.append(add_menu_item)
logger.info(f"[{ADDON_NAME}.__init__] 插件 '{ADDON_NAME}' 已加载。")
