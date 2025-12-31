# dialog/card_manager.py - 卡片管理功能（添加到Anki）

import os
import json
import urllib.request
import urllib.parse
import logging
from typing import Optional, List, Dict, Any
from aqt import mw
from ..consts import ADDON_NAME, DEFAULT_FIELD_NAMES
from ..upload_to_anki import upload_anki

logger = logging.getLogger(ADDON_NAME)


class CardManager:
    """卡片管理器（处理添加到Anki的功能）"""
    
    def __init__(self, config: Dict[str, Any], webview):
        self.config = config
        self.webview = webview
    
    def add_to_anki(self, front_content: str, back_content: str, audio_filename: str, card_type: str, deck_name: str,
                    include_pronunciation: bool, timestamps: Optional[List[Dict[str, Any]]]) -> None:
        """
        将生成的卡片添加到 Anki 集合中
        
        Args:
            front_content: 卡片正面内容（日文句子）
            back_content: 卡片背面内容（翻译和解释）
            audio_filename: 音频文件名或URL
            card_type: 卡片类型（笔记模型名称）
            deck_name: 牌组名称
            include_pronunciation: 是否包含发音
            timestamps: 时间戳数据列表
        """
        final_deck_name = deck_name.strip() or self.config.get('default_deck_name')
        
        # 处理音频：如果是URL，需要下载；如果是文件名，直接使用
        audio_path_to_add = None
        if audio_filename and include_pronunciation:
            if audio_filename.startswith('http://') or audio_filename.startswith('https://'):
                # 是URL，需要下载
                try:
                    logger.info(f"Downloading audio from URL: {audio_filename}")
                    audio_filename_only = os.path.basename(urllib.parse.urlparse(audio_filename).path) or "audio.mp3"
                    audio_path = os.path.join(mw.col.media.dir(), audio_filename_only)
                    urllib.request.urlretrieve(audio_filename, audio_path)
                    audio_path_to_add = audio_path
                    logger.info(f"Audio downloaded to: {audio_path}")
                except Exception as e:
                    logger.exception(f"Failed to download audio from URL: {e}")
                    self.webview.eval(f"displayTemporaryMessage('下载音频失败: {e}', 'red', 5000);")
            else:
                # 是文件名，直接使用
                audio_path_to_add = os.path.join(mw.col.media.dir(), audio_filename) if os.path.exists(os.path.join(mw.col.media.dir(), audio_filename)) else None

        try:
            note_ids = upload_anki(
                word_or_sentence=front_content,
                back_content=back_content,
                card_type=card_type,
                audio_file_path=audio_path_to_add,
                deck_name=final_deck_name
            )

            # 如果成功添加了笔记并且有时间戳数据，则更新笔记的 Timestamps 字段
            if note_ids and timestamps:
                note_id = note_ids[0]
                note = mw.col.get_note(note_id)
                timestamps_field_name = DEFAULT_FIELD_NAMES['Timestamps']
                if note and timestamps_field_name in note.keys():
                    note[timestamps_field_name] = json.dumps(timestamps)
                    mw.col.update_note(note)
                    logger.info(f"Updated note {note_id} with new timestamps.")

            self.webview.eval("setLoading(false);")
            if note_ids:
                if self.config.get('last_used_deck') != final_deck_name:
                    self.config['last_used_deck'] = final_deck_name
                    mw.addonManager.writeConfig(ADDON_NAME, self.config)
                msg = f"成功添加卡片到 '{final_deck_name}'！"
                self.webview.eval(f"displayTemporaryMessage('{msg}', 'green', 4000);")
                self.webview.eval("clearAfterSuccess();")
                # 刷新牌组卡片列表（刷新两个tab的列表，如果它们有相同的牌组名称）
                deck_name_js = json.dumps(final_deck_name)
                self.webview.eval(f"""
                    (function() {{
                        // 刷新 generator tab 的牌组卡片列表
                        const generatorDeckName = document.getElementById('deckName')?.value?.trim();
                        if (generatorDeckName === {deck_name_js} && typeof loadDeckCards === 'function') {{
                            loadDeckCards('generator', generatorDeckName);
                        }}
                        // 刷新 asr tab 的牌组卡片列表
                        const asrDeckName = document.getElementById('asrDeckName')?.value?.trim();
                        if (asrDeckName === {deck_name_js} && typeof loadDeckCards === 'function') {{
                            loadDeckCards('asr', asrDeckName);
                        }}
                    }})();
                """)
            else:
                self.webview.eval("displayTemporaryMessage('添加到 Anki 失败。', 'red', 5000);")
        except Exception as e:
            logger.exception(f"Exception during add_to_anki: {e}")
            self.webview.eval(f"displayTemporaryMessage('添加卡片时发生错误: {e}', 'red', 5000);")

