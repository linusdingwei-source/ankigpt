# dialog/deck_browser.py - 牌组浏览功能

import os
import json
import re
import logging
from typing import Dict, Any
from aqt import mw
from ..consts import ADDON_NAME, DEFAULT_FIELD_NAMES, SUPPORTED_CARD_TYPES
from ..llm import estimate_timestamps
from ..utils import encode_audio_to_base64, get_audio_mime_type

logger = logging.getLogger(ADDON_NAME)


class DeckBrowserHandler:
    """牌组浏览功能处理器"""
    
    def __init__(self, config: Dict[str, Any], webview):
        self.config = config
        self.webview = webview
    
    def fetch_deck_cards(self, deck_name: str) -> None:
        """
        获取指定牌组中的所有卡片信息
        
        Args:
            deck_name: 牌组名称
        """
        if not deck_name: 
            return
        logger.info(f"Fetching cards for deck: {deck_name}")
        try:
            query = f'"deck:{deck_name}"'
            nids = mw.col.find_notes(query)
            cards_info = []
            for nid in nids:
                note = mw.col.get_note(nid)
                if not note: 
                    continue
                try:
                    first_field_name = note.note_type()['flds'][0]['name']
                    front_content = note[first_field_name]
                    cards_info.append({"nid": nid, "front": front_content})
                except (IndexError, KeyError):
                    logger.warning(f"Could not get front field for note {nid}, skipping.")
            cards_info.reverse()
            # 根据当前激活的tab来决定填充哪个列表
            # 检查生成器tab是否激活
            self.webview.eval(f"""
                (function() {{
                    const generatorTab = document.getElementById('generatorTab');
                    const asrTab = document.getElementById('asrTab');
                    const browserTab = document.getElementById('browserTab');
                    
                    if (generatorTab && generatorTab.classList.contains('active')) {{
                        if (typeof window.populateGeneratorDeckCards === 'function') {{
                            window.populateGeneratorDeckCards({json.dumps(cards_info)});
                        }}
                    }} else if (asrTab && asrTab.classList.contains('active')) {{
                        if (typeof window.populateAsrDeckCards === 'function') {{
                            window.populateAsrDeckCards({json.dumps(cards_info)});
                        }}
                    }} else if (browserTab && browserTab.classList.contains('active')) {{
                        if (typeof window.populateDeckCardList === 'function') {{
                            window.populateDeckCardList({json.dumps(cards_info)}, false);
                        }}
                    }}
                }})();
            """)
        except Exception as e:
            logger.exception(f"Error fetching deck cards: {e}")
    
    def fetch_card_details(self, nid: int) -> None:
        """
        获取指定笔记的详细信息
        
        包括正面内容、背面内容、音频和时间戳数据
        
        Args:
            nid: 笔记 ID
        """
        logger.info(f"Fetching details for note ID: {nid}")
        try:
            note = mw.col.get_note(nid)
            if not note: 
                return

            fields = {f['name']: note.fields[f['ord']] for f in note.note_type()['flds']}
            
            # 动态获取字段名，支持不同卡片类型
            card_type_name = note.note_type()['name']
            card_config = SUPPORTED_CARD_TYPES.get(card_type_name, {})
            
            front_field = card_config.get('front_field', DEFAULT_FIELD_NAMES['正面'])
            back_field = card_config.get('back_field', DEFAULT_FIELD_NAMES['背面'])
            audio_field_name = card_config.get('audio_field', DEFAULT_FIELD_NAMES['Audio'])
            
            front_content = fields.get(front_field, '')
            back_content = fields.get(back_field, '')
            
            # 尝试从主音频字段获取音频，如果失败，再尝试备用字段
            audio_field = fields.get(audio_field_name, fields.get(DEFAULT_FIELD_NAMES['发音'], ''))
            
            timestamps_field = fields.get(DEFAULT_FIELD_NAMES['Timestamps'], '')

            timestamps = None
            audio_path = None
            audio_filename = ""

            if audio_field:
                match = re.search(r'\[sound:(.*?)\]', audio_field)
                if match:
                    audio_filename = match.group(1)
                    audio_path = os.path.join(mw.col.media.dir(), audio_filename)

            if timestamps_field:
                try:
                    timestamps = json.loads(timestamps_field)
                    logger.info(f"Loaded timestamps from note field for nid {nid}.")
                except (json.JSONDecodeError, TypeError):
                    logger.warning(f"Invalid JSON in Timestamps field for nid {nid}. Will re-estimate.")

            if not timestamps and front_content and audio_path and os.path.exists(audio_path):
                logger.info(f"Estimating timestamps on-the-fly for nid {nid}.")
                ssml_config = self.config.get('ssml_options', {})
                timestamps = estimate_timestamps(front_content, audio_path, ssml_config, logger)
                timestamps_field_name = DEFAULT_FIELD_NAMES['Timestamps']
                if timestamps and timestamps_field_name in note.keys():
                    note[timestamps_field_name] = json.dumps(timestamps)
                    mw.col.update_note(note)
                    logger.info(f"Updated note {nid} with newly estimated timestamps.")

            audio_base64 = ""
            if audio_path and os.path.exists(audio_path):
                mime_type = get_audio_mime_type(audio_path)
                audio_base64 = encode_audio_to_base64(audio_path, mime_type) or ""

            card_data = {
                "success": True,
                "isExistingCard": True,
                "nid": nid,
                "frontContent": front_content,
                "backContent": back_content,
                "audioBase64": audio_base64,
                "audioFilename": audio_filename,
                "timestamps": timestamps or []
            }
            self.webview.eval(f"window.displayDeckCardDetails({json.dumps(card_data)});")
        except Exception as e:
            logger.exception(f"Error fetching card details: {e}")
    
    def delete_deck_card(self, nid: int) -> None:
        """
        删除指定的卡片
        
        Args:
            nid: 笔记 ID
        """
        logger.info(f"[delete_deck_card] 删除卡片，NID: {nid}")
        try:
            note = mw.col.get_note(nid)
            if not note:
                logger.warning(f"[delete_deck_card] 笔记 {nid} 不存在")
                self.webview.eval("displayTemporaryMessage('卡片不存在', 'red', 3000);")
                return
            
            # 获取牌组名称（用于刷新列表）
            deck_id = note.cards()[0].did if note.cards() else None
            deck_name = None
            if deck_id:
                deck = mw.col.decks.get(deck_id)
                if deck:
                    deck_name = deck['name']
            
            # 删除笔记（这会自动删除所有相关的卡片）
            mw.col.remNotes([nid])
            mw.col.save()
            
            logger.info(f"[delete_deck_card] 成功删除笔记 {nid}")
            self.webview.eval("displayTemporaryMessage('卡片已删除', 'green', 3000);")
            
            # 刷新卡片列表，并自动选择下一个卡片
            if deck_name:
                # 先获取当前索引，然后刷新列表
                deck_name_js = json.dumps(deck_name)
                self.webview.eval(f"""
                    (function() {{
                        const currentIndex = typeof getCurrentCardIndex === 'function' ? getCurrentCardIndex() : -1;
                        const deckName = {deck_name_js};
                        // 刷新列表
                        pycmd('fetch_deck_cards::["' + deckName + '"]');
                        // 延迟一下，等待列表刷新完成
                        setTimeout(function() {{
                            const cardList = typeof getDeckCardList === 'function' ? getDeckCardList() : [];
                            const previewPanel = document.getElementById('deckCardPreview');
                            if (cardList.length === 0) {{
                                // 如果列表为空，清空预览区
                                if (previewPanel) {{
                                    previewPanel.innerHTML = '<div class="preview-placeholder"><p>此牌组中没有卡片</p></div>';
                                }}
                            }} else {{
                                // 如果有卡片，选择下一个应该显示的卡片
                                let targetIndex = currentIndex;
                                if (targetIndex >= cardList.length) {{
                                    targetIndex = cardList.length - 1;
                                }}
                                if (targetIndex < 0 && cardList.length > 0) {{
                                    targetIndex = 0;
                                }}
                                if (targetIndex >= 0 && targetIndex < cardList.length) {{
                                    const targetCard = cardList[targetIndex];
                                    const listItems = document.querySelectorAll('#deckCardList li');
                                    if (listItems[targetIndex]) {{
                                        listItems[targetIndex].classList.add('selected');
                                        if (typeof setCurrentCardIndex === 'function') {{
                                            setCurrentCardIndex(targetIndex);
                                        }}
                                        previewPanel.innerHTML = '<div class="preview-placeholder loading"><p>正在加载卡片详情...</p></div>';
                                        pycmd('fetch_card_details::[' + targetCard.nid + ']');
                                    }}
                                }}
                            }}
                        }}, 100);
                    }})();
                """)
            else:
                # 如果无法获取牌组名称，清空预览
                self.webview.eval("document.getElementById('deckCardPreview').innerHTML = '<div class=\\'preview-placeholder\\'><p>请在左侧选择一张卡片进行预览</p></div>';")
        except Exception as e:
            logger.exception(f"[delete_deck_card] 删除卡片时发生异常: {e}")
            self.webview.eval(f"displayTemporaryMessage('删除卡片时发生错误: {e}', 'red', 5000);")
    
    def edit_deck_card(self, nid: int) -> None:
        """
        编辑指定的卡片（打开Anki的编辑对话框）
        
        Args:
            nid: 笔记 ID
        """
        logger.info(f"[edit_deck_card] 编辑卡片，NID: {nid}")
        try:
            note = mw.col.get_note(nid)
            if not note:
                logger.warning(f"[edit_deck_card] 笔记 {nid} 不存在")
                self.webview.eval("displayTemporaryMessage('卡片不存在', 'red', 3000);")
                return
            
            # 打开Anki的编辑对话框
            # 尝试多种方法打开编辑对话框
            try:
                # 方法1: 尝试使用 mw.editNote（如果存在）
                if hasattr(mw, 'editNote'):
                    mw.editNote(note)
                    logger.info(f"[edit_deck_card] 使用 mw.editNote 打开编辑对话框，NID: {nid}")
                # 方法2: 尝试使用 aqt.browser.Browser
                elif hasattr(mw, 'openBrowser'):
                    mw.openBrowser(search=f"nid:{nid}")
                    logger.info(f"[edit_deck_card] 使用 mw.openBrowser 打开浏览器，NID: {nid}")
                    self.webview.eval("displayTemporaryMessage('已在浏览器中打开该卡片，请双击进行编辑', 'green', 4000);")
                    return
                # 方法3: 尝试使用 aqt.browser.Browser 类
                else:
                    try:
                        from aqt.browser import Browser
                        # 如果浏览器窗口已存在，使用它；否则创建新的
                        if hasattr(mw, 'browser') and mw.browser:
                            browser = mw.browser
                        else:
                            browser = Browser(mw)
                            mw.browser = browser
                        browser.search_for(f"nid:{nid}")
                        browser.show()
                        logger.info(f"[edit_deck_card] 使用 Browser 类打开浏览器，NID: {nid}")
                        self.webview.eval("displayTemporaryMessage('已在浏览器中打开该卡片，请双击进行编辑', 'green', 4000);")
                        return
                    except ImportError:
                        # 如果导入失败，尝试直接使用 aqt.browser
                        try:
                            from aqt import browser
                            if hasattr(browser, 'Browser'):
                                browser_instance = browser.Browser(mw)
                                browser_instance.search_for(f"nid:{nid}")
                                browser_instance.show()
                                logger.info(f"[edit_deck_card] 使用 aqt.browser.Browser 打开浏览器，NID: {nid}")
                                self.webview.eval("displayTemporaryMessage('已在浏览器中打开该卡片，请双击进行编辑', 'green', 4000);")
                                return
                        except Exception as e_import:
                            logger.error(f"[edit_deck_card] 无法导入Browser类: {e_import}")
                            raise
                
                # 如果使用 mw.editNote 成功，设置定时器刷新
                if hasattr(mw, 'editNote'):
                    # 编辑完成后，刷新卡片详情
                    # 使用定时器延迟刷新，确保编辑对话框已关闭
                    from PyQt6.QtCore import QTimer
                    timer = QTimer()
                    timer.setSingleShot(True)
                    timer.timeout.connect(lambda: self.fetch_card_details(nid))
                    timer.start(500)  # 延迟500ms刷新
            except Exception as e2:
                logger.error(f"[edit_deck_card] 无法打开编辑对话框: {e2}")
                # 最后的备选方案：提示用户手动操作
                self.webview.eval("displayTemporaryMessage('无法打开编辑对话框，请在Anki浏览器中搜索该卡片进行编辑', 'red', 5000);")
        except Exception as e:
            logger.exception(f"[edit_deck_card] 编辑卡片时发生异常: {e}")
            self.webview.eval(f"displayTemporaryMessage('编辑卡片时发生错误: {e}', 'red', 5000);")

