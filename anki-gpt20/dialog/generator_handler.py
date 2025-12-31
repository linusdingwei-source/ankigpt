# dialog/generator_handler.py - 生成器功能处理

import os
import json
import base64
import logging
from typing import Dict, Any
from aqt import mw
from ..llm import get_anki_card_content_from_llm
from ..utils import encode_audio_to_base64, get_audio_mime_type
from ..consts import ADDON_NAME
from ..upload_to_anki import upload_anki

logger = logging.getLogger(ADDON_NAME)


class GeneratorHandler:
    """生成器功能处理器"""
    
    def __init__(self, config: Dict[str, Any], webview):
        self.config = config
        self.webview = webview
    
    def generate_preview(self, text_input: str) -> None:
        """
        生成卡片预览
        
        在后台调用 LLM 生成卡片内容，包括翻译、解释和音频
        
        Args:
            text_input: 用户输入的日文句子或单词
        """
        api_key = self.config.get('dashscope_api_key')
        if not api_key:
            self.webview.eval("displayTemporaryMessage('请先在\"设置\"页面中设置 API Key！', 'red', 5000);")
            return
        self.webview.eval("setLoading(true, '正在生成预览...');")
        mw.taskman.run_in_background(
            lambda: self._background_generate(text_input, api_key),
            self._on_preview_generation_complete
        )
    
    def _background_generate(self, text_input: str, api_key: str) -> Dict[str, Any]:
        """
        后台生成卡片内容
        
        调用 LLM 和 TTS 服务生成卡片内容，包括：
        - 卡片背面内容（翻译和解释）
        - 音频文件
        - 时间戳数据（对齐到原文）
        
        Args:
            text_input: 日文句子或单词（原文）
            api_key: DashScope API Key
        
        Returns:
            包含生成结果的字典，包含 success、frontContent、backContent 等字段
        """
        try:
            media_dir = mw.col.media.dir()
            back_content, audio_path, timestamps, kana_text = get_anki_card_content_from_llm(
                japanese_sentence=text_input,
                output_audio_dir=media_dir,
                api_key=api_key,
                config=self.config
            )
            if not back_content: 
                return {"success": False, "error": "LLM 未能生成卡片内容。"}
            
            # 如果时间戳存在且假名与原文不同，将对齐时间戳到原文
            aligned_timestamps = timestamps or []
            if timestamps and kana_text and kana_text != text_input:
                logger.info(f"假名与原文不同，开始对齐时间戳: 原文='{text_input}', 假名='{kana_text}'")
                aligned_timestamps = self._align_timestamps_to_original_text(
                    original_text=text_input,
                    kana_text=kana_text,
                    kana_timestamps=timestamps
                )
                logger.info(f"时间戳对齐完成: 原始 {len(timestamps)} 个，对齐后 {len(aligned_timestamps)} 个")
            
            audio_base64 = ""
            audio_filename = ""
            if audio_path and os.path.exists(audio_path):
                mime_type = get_audio_mime_type(audio_path)
                audio_base64 = encode_audio_to_base64(audio_path, mime_type) or ""
                audio_filename = os.path.basename(audio_path)
            return {
                "success": True,
                "isExistingCard": False,
                "frontContent": text_input,  # 使用原文作为正面内容
                "backContent": back_content,
                "audioBase64": audio_base64,
                "audioFilename": audio_filename,
                "timestamps": aligned_timestamps  # 对齐后的时间戳（基于原文）
            }
        except Exception as e:
            logger.exception(f"Exception in _background_generate: {e}")
            return {"success": False, "error": f"后台任务发生异常: {str(e)}"}
    
    def _align_timestamps_to_original_text(self, original_text: str, kana_text: str, 
                                           kana_timestamps: list) -> list:
        """
        将基于假名的时间戳对齐到原文
        
        Args:
            original_text: 原文（日文汉字）
            kana_text: 假名文本
            kana_timestamps: 基于假名的时间戳列表
        
        Returns:
            对齐后的时间戳列表（text字段为原文）
        """
        try:
            from typing import List, Dict, Any
            import string
            
            # 移除标点符号，得到纯文本用于对齐
            japanese_punctuation = '。、，？！：；'
            all_punctuation = string.punctuation + japanese_punctuation + ' '
            
            def remove_punctuation(text: str) -> str:
                """移除标点符号和空格"""
                return ''.join(c for c in text if c not in all_punctuation)
            
            original_clean = remove_punctuation(original_text)
            kana_clean = remove_punctuation(kana_text)
            
            # 构建假名文本的完整字符串（从时间戳）
            kana_text_from_timestamps = ''.join(ts.get('text', '') for ts in kana_timestamps)
            kana_clean_from_ts = remove_punctuation(kana_text_from_timestamps)
            
            # 如果纯文本相同，直接映射（这种情况很少，因为假名和汉字通常不同）
            if original_clean == kana_clean or original_clean == kana_clean_from_ts:
                logger.info("[_align_timestamps_to_original_text] 纯文本相同，直接映射时间戳")
                aligned_timestamps = []
                original_char_idx = 0
                
                # 构建字符到时间戳的映射（基于假名时间戳文本）
                char_to_ts = {}
                char_pos = 0
                for ts in kana_timestamps:
                    word_text = ts.get('text', '')
                    for char in word_text:
                        if char not in all_punctuation:
                            char_to_ts[char_pos] = ts
                            char_pos += 1
                
                for char in original_text:
                    if char in all_punctuation:
                        # 标点符号：使用前一个字符的时间戳
                        if aligned_timestamps:
                            last_ts = aligned_timestamps[-1]
                            aligned_timestamps.append({
                                'text': char,
                                'begin_time': last_ts.get('begin_time', 0),
                                'end_time': last_ts.get('end_time', last_ts.get('begin_time', 0))
                            })
                    else:
                        # 字符：使用对应的假名时间戳
                        if original_char_idx in char_to_ts:
                            ts = char_to_ts[original_char_idx]
                            aligned_timestamps.append({
                                'text': char,
                                'begin_time': ts.get('begin_time', 0),
                                'end_time': ts.get('end_time', ts.get('begin_time', 0))
                            })
                            original_char_idx += 1
                        else:
                            # 如果找不到对应的时间戳，使用前一个
                            if aligned_timestamps:
                                last_ts = aligned_timestamps[-1]
                                aligned_timestamps.append({
                                    'text': char,
                                    'begin_time': last_ts.get('begin_time', 0),
                                    'end_time': last_ts.get('end_time', last_ts.get('begin_time', 0))
                                })
                            original_char_idx += 1
                
                return aligned_timestamps
            
            # 如果纯文本不同，使用简单的字符级对齐
            # 由于假名和汉字通常长度不同，这里使用一个简化的方法：
            # 将假名时间戳按比例分配到原文字符上
            logger.info("[_align_timestamps_to_original_text] 纯文本不同，使用比例分配对齐")
            aligned_timestamps = []
            
            # 计算假名文本的总时长
            if kana_timestamps:
                total_duration = kana_timestamps[-1].get('end_time', kana_timestamps[-1].get('begin_time', 0))
                # 按原文字符数平均分配时间
                original_chars = [c for c in original_text if c not in all_punctuation]
                if len(original_chars) > 0:
                    time_per_char = total_duration / len(original_chars)
                    char_idx = 0
                    for char in original_text:
                        if char in all_punctuation:
                            # 标点符号：使用前一个字符的时间戳
                            if aligned_timestamps:
                                last_ts = aligned_timestamps[-1]
                                aligned_timestamps.append({
                                    'text': char,
                                    'begin_time': last_ts.get('end_time', last_ts.get('begin_time', 0)),
                                    'end_time': last_ts.get('end_time', last_ts.get('begin_time', 0))
                                })
                        else:
                            # 字符：按比例分配时间
                            begin_time = int(char_idx * time_per_char)
                            end_time = int((char_idx + 1) * time_per_char)
                            aligned_timestamps.append({
                                'text': char,
                                'begin_time': begin_time,
                                'end_time': end_time
                            })
                            char_idx += 1
                else:
                    # 如果原文只有标点符号，使用第一个时间戳
                    first_ts = kana_timestamps[0] if kana_timestamps else {}
                    for char in original_text:
                        aligned_timestamps.append({
                            'text': char,
                            'begin_time': first_ts.get('begin_time', 0),
                            'end_time': first_ts.get('end_time', first_ts.get('begin_time', 0))
                        })
            else:
                # 如果没有时间戳，创建占位符
                for char in original_text:
                    aligned_timestamps.append({
                        'text': char,
                        'begin_time': 0,
                        'end_time': 0
                    })
            
            return aligned_timestamps
            
        except Exception as e:
            logger.exception(f"[_align_timestamps_to_original_text] 对齐时间戳时发生异常: {e}")
            # 如果对齐失败，返回基于原文的简单时间戳（时间可能不准确）
            logger.warning("时间戳对齐失败，使用简化的时间戳（时间可能不准确）")
            aligned_timestamps = []
            for char in original_text:
                aligned_timestamps.append({
                    'text': char,
                    'begin_time': 0,
                    'end_time': 0
                })
            return aligned_timestamps
    
    def _on_preview_generation_complete(self, future) -> None:
        """预览生成完成后的回调"""
        self.webview.eval("setLoading(false);")
        try:
            result = future.result()
            result_json = json.dumps(result)
            result_base64 = base64.b64encode(result_json.encode('utf-8')).decode('utf-8')
            self.webview.eval(f"displayPreviewFromBase64('{result_base64}');")
        except Exception as e:
            logger.exception(f"Error processing preview result: {e}")
            self.webview.eval(f"displayTemporaryMessage('处理预览结果时出错: {e}', 'red', 5000);")
    
    def split_and_generate_cards(self, front_content: str, card_type: str, deck_name: str, include_pronunciation: bool) -> None:
        """
        将正面内容拆分成多个句子，为每个句子生成卡片并添加到牌组
        
        Args:
            front_content: 正面内容（可能包含多个句子）
            card_type: 卡片类型
            deck_name: 牌组名称
            include_pronunciation: 是否包含发音
        """
        api_key = self.config.get('dashscope_api_key')
        if not api_key:
            self.webview.eval("displayTemporaryMessage('请先在\"设置\"页面中设置 API Key！', 'red', 5000);")
            return
        
        # 拆分句子
        sentences = self._split_sentences(front_content)
        if not sentences:
            self.webview.eval("displayTemporaryMessage('未能拆分出句子，请检查内容格式。', 'red', 5000);")
            return
        
        logger.info(f"拆分出 {len(sentences)} 个句子，开始批量生成卡片...")
        self.webview.eval(f"setLoading(true, '正在为 {len(sentences)} 个句子生成卡片...');")
        
        # 在后台批量生成和添加卡片
        mw.taskman.run_in_background(
            lambda: self._batch_generate_and_add(sentences, api_key, card_type, deck_name, include_pronunciation),
            self._on_batch_generation_complete
        )
    
    def _split_sentences(self, text: str) -> list:
        """
        将文本拆分成句子
        
        根据日文标点符号拆分：。！？\n 等
        支持日文引号「」内的内容作为一个整体
        
        Args:
            text: 待拆分的文本
        
        Returns:
            句子列表
        """
        import re
        # 移除首尾空白
        text = text.strip()
        if not text:
            return []
        
        # 先按换行符拆分
        lines = text.split('\n')
        sentences = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 按日文标点符号拆分：。！？
            # 使用正则表达式，在标点符号后分割，但保留标点符号
            # 匹配：。！？以及换行符后的内容
            parts = re.split(r'([。！？])', line)
            current_sentence = ""
            
            for part in parts:
                if part in ['。', '！', '？']:
                    current_sentence += part
                    if current_sentence.strip():
                        sentences.append(current_sentence.strip())
                    current_sentence = ""
                else:
                    current_sentence += part
            
            # 处理最后一部分（可能没有标点符号结尾）
            if current_sentence.strip():
                sentences.append(current_sentence.strip())
        
        # 过滤空句子和只包含空白字符的句子
        sentences = [s for s in sentences if s.strip()]
        
        # 进一步处理：如果句子以「开头，找到对应的」结尾
        # 这样可以确保引号内的内容作为一个完整句子
        final_sentences = []
        i = 0
        while i < len(sentences):
            sentence = sentences[i]
            # 如果句子以「开头但没有」结尾，尝试合并后续句子直到找到」
            if sentence.startswith('「') and '」' not in sentence:
                merged = sentence
                i += 1
                while i < len(sentences) and '」' not in merged:
                    merged += sentences[i]
                    i += 1
                final_sentences.append(merged.strip())
            else:
                final_sentences.append(sentence.strip())
                i += 1
        
        # 去掉每个句子首尾的「」引号
        cleaned_sentences = []
        for sentence in final_sentences:
            cleaned = sentence.strip()
            # 如果句子以「开头且以」结尾，去掉首尾的引号
            if cleaned.startswith('「') and cleaned.endswith('」'):
                cleaned = cleaned[1:-1].strip()  # 去掉首尾的「和」
            # 如果句子以「开头但没有」结尾，只去掉开头的「
            elif cleaned.startswith('「'):
                cleaned = cleaned[1:].strip()
            # 如果句子以」结尾但没有「开头，只去掉结尾的」
            elif cleaned.endswith('」'):
                cleaned = cleaned[:-1].strip()
            
            # 只添加非空句子
            if cleaned:
                cleaned_sentences.append(cleaned)
        
        return cleaned_sentences
    
    def _batch_generate_and_add(self, sentences: list, api_key: str, card_type: str, deck_name: str, include_pronunciation: bool) -> Dict[str, Any]:
        """
        批量生成卡片并添加到 Anki
        
        Args:
            sentences: 句子列表
            api_key: DashScope API Key
            card_type: 卡片类型
            deck_name: 牌组名称
            include_pronunciation: 是否包含发音
        
        Returns:
            包含成功和失败统计的字典
        """
        success_count = 0
        fail_count = 0
        failed_sentences = []
        media_dir = mw.col.media.dir()
        final_deck_name = deck_name.strip() or self.config.get('default_deck_name')
        
        for idx, sentence in enumerate(sentences, 1):
            try:
                logger.info(f"正在处理第 {idx}/{len(sentences)} 个句子: {sentence[:50]}...")
                
                # 生成卡片内容
                back_content, audio_path, timestamps, kana_text = get_anki_card_content_from_llm(
                    japanese_sentence=sentence,
                    output_audio_dir=media_dir,
                    api_key=api_key,
                    config=self.config
                )
                
                # 如果时间戳存在且假名与原文不同，将对齐时间戳到原文
                aligned_timestamps = timestamps or []
                if timestamps and kana_text and kana_text != sentence:
                    logger.info(f"批量生成 - 假名与原文不同，对齐时间戳: 原文='{sentence}', 假名='{kana_text}'")
                    aligned_timestamps = self._align_timestamps_to_original_text(
                        original_text=sentence,
                        kana_text=kana_text,
                        kana_timestamps=timestamps
                    )
                else:
                    aligned_timestamps = timestamps or []
                
                if not back_content:
                    logger.warning(f"句子 {idx} 生成失败: LLM 未能生成内容")
                    fail_count += 1
                    failed_sentences.append(sentence)
                    continue
                
                # 添加到 Anki
                audio_file_path = audio_path if (include_pronunciation and audio_path and os.path.exists(audio_path)) else None
                note_ids = upload_anki(
                    word_or_sentence=sentence,
                    back_content=back_content,
                    card_type=card_type,
                    audio_file_path=audio_file_path,
                    deck_name=final_deck_name
                )
                
                if note_ids:
                    # 如果有对齐后的时间戳，更新笔记
                    if aligned_timestamps:
                        note_id = note_ids[0]
                        note = mw.col.get_note(note_id)
                        timestamps_field_name = "Timestamps"
                        if note and timestamps_field_name in note.keys():
                            note[timestamps_field_name] = json.dumps(aligned_timestamps)
                            mw.col.update_note(note)
                    success_count += 1
                    logger.info(f"句子 {idx} 添加成功")
                else:
                    fail_count += 1
                    failed_sentences.append(sentence)
                    logger.warning(f"句子 {idx} 添加失败")
            
            except Exception as e:
                logger.exception(f"处理句子 {idx} 时发生异常: {e}")
                fail_count += 1
                failed_sentences.append(sentence)
        
        return {
            "success": True,
            "total": len(sentences),
            "success_count": success_count,
            "fail_count": fail_count,
            "failed_sentences": failed_sentences,
            "deck_name": final_deck_name
        }
    
    def _on_batch_generation_complete(self, future) -> None:
        """批量生成完成后的回调"""
        self.webview.eval("setLoading(false);")
        try:
            result = future.result()
            total = result.get("total", 0)
            success_count = result.get("success_count", 0)
            fail_count = result.get("fail_count", 0)
            failed_sentences = result.get("failed_sentences", [])
            
            if success_count > 0:
                msg = f"成功生成并添加 {success_count}/{total} 张卡片到牌组！"
                self.webview.eval(f"displayTemporaryMessage('{msg}', 'green', 5000);")
                
                # 刷新牌组卡片列表
                deck_name = result.get("deck_name", "")
                if deck_name:
                    deck_name_js = json.dumps(deck_name)
                    self.webview.eval(f"""
                        (function() {{
                            const asrDeckName = document.getElementById('asrDeckName')?.value?.trim();
                            if (asrDeckName === {deck_name_js} && typeof loadDeckCards === 'function') {{
                                loadDeckCards('asr', asrDeckName);
                            }}
                        }})();
                    """)
            
            if fail_count > 0:
                error_msg = f"有 {fail_count} 个句子生成失败"
                if failed_sentences:
                    failed_text = "\\n".join(failed_sentences[:3])  # 只显示前3个
                    if len(failed_sentences) > 3:
                        failed_text += f"\\n... 还有 {len(failed_sentences) - 3} 个"
                    error_msg += f":\\n{failed_text}"
                self.webview.eval(f"displayTemporaryMessage('{error_msg}', 'orange', 8000);")
        except Exception as e:
            logger.exception(f"Error processing batch generation result: {e}")
            self.webview.eval(f"displayTemporaryMessage('批量生成时出错: {e}', 'red', 5000);")

