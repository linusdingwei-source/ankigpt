# dialog/asr_handler.py - ASR功能处理

import json
import base64
import re
import logging
from typing import Dict, Any, List
from aqt import mw
from ..llm.providers.dashscope import DashScopeLLMService
from ..llm.utils import markdown_to_anki_html
from ..consts import ADDON_NAME

logger = logging.getLogger(ADDON_NAME)


class ASRHandler:
    """ASR功能处理器"""
    
    def __init__(self, config: Dict[str, Any], webview):
        self.config = config
        self.webview = webview
    
    def asr_transcribe(self, audio_url: str) -> None:
        """
        音频转文字功能
        
        调用 DashScope ASR API 将音频转换为文字，然后使用 LLM 生成解释
        
        Args:
            audio_url: 音频文件的URL地址
        """
        logger.info(f"[asr_transcribe] 收到转写请求，音频URL: {audio_url}")
        api_key = self.config.get('dashscope_api_key')
        if not api_key:
            logger.warning("[asr_transcribe] API Key未设置")
            self.webview.eval("displayTemporaryMessage('请先在\"设置\"页面中设置 API Key！', 'red', 5000);")
            return
        
        if not audio_url or not audio_url.strip():
            logger.warning("[asr_transcribe] 音频URL为空")
            self.webview.eval("displayTemporaryMessage('请输入音频地址！', 'red', 3000);")
            return
        
        logger.info(f"[asr_transcribe] 开始转写任务，URL长度: {len(audio_url)}")
        self.webview.eval("setLoading(true, '正在转写音频...');")
        mw.taskman.run_in_background(
            lambda: self._background_asr_transcribe(audio_url, api_key),
            self._on_asr_transcribe_complete
        )
        logger.info("[asr_transcribe] 后台任务已提交")
    
    def _background_asr_transcribe(self, audio_url: str, api_key: str) -> Dict[str, Any]:
        """
        后台执行音频转文字任务
        
        Args:
            audio_url: 音频文件的URL地址
            api_key: DashScope API Key
        
        Returns:
            包含转写结果的字典
        """
        logger.info(f"[_background_asr_transcribe] 开始执行转写任务")
        logger.info(f"[_background_asr_transcribe] 音频URL: {audio_url}")
        logger.info(f"[_background_asr_transcribe] API Key前5位: {api_key[:5] if api_key else 'None'}...")
        
        try:
            # 使用ASR服务进行转写
            from ..llm.providers.dashscope_asr import DashScopeASRService
            
            asr_service = DashScopeASRService(api_key=api_key)
            asr_result = asr_service.transcribe(audio_url, language_hints=['ja'])
            
            if not asr_result.get('success', False):
                return {
                    "success": False,
                    "error": asr_result.get('error', '转写失败')
                }
            
            text_content = asr_result.get('text', '')
            timestamps = asr_result.get('timestamps', [])
            
            if not text_content:
                return {"success": False, "error": "未能从转写结果中提取文本"}
            
            logger.info(f"[_background_asr_transcribe] 提取的文本: {text_content[:100]}...")
            logger.info(f"[_background_asr_transcribe] 提取的时间戳数量: {len(timestamps) if timestamps else 0}")
            
            # 使用LLM生成解释（注意：这里不应该生成新的TTS音频，因为我们已经有了原始音频）
            logger.info("[_background_asr_transcribe] 开始调用LLM生成解释")
            
            # 只调用LLM生成解释，不生成TTS（因为我们已经有了原始音频）
            llm_service = DashScopeLLMService(api_key=api_key)
            # 传入 is_asr_text=True，让LLM优化标点符号
            back_content_md = llm_service.generate_analysis(text_content, is_asr_text=True)
            back_content = markdown_to_anki_html(back_content_md)
            
            if not back_content:
                return {"success": False, "error": "LLM 未能生成解释内容"}
            
            # 从LLM返回的markdown中提取"优化后的日文"
            optimized_text = text_content  # 默认使用原始文本
            # 尝试多种格式匹配：**优化后的日文：** 后面跟内容，直到下一个 ** 标记（如 **中文翻译：**）
            # 使用更精确的匹配，确保匹配到完整内容
            patterns = [
                # 匹配 **优化后的日文：** 到 **中文翻译：** 之间的所有内容
                r'\*\*优化后的日文[：:]\*\*\s*\n\s*(.+?)(?=\n\s*\*\*中文翻译|$)',
                # 匹配 **优化后的日文**： 到下一个 ** 标记之间的内容
                r'\*\*优化后的日文\*\*[：:]\s*\n\s*(.+?)(?=\n\s*\*\*[^*]|$)',
                # 匹配 优化后的日文： 到下一个 ** 标记之间的内容
                r'优化后的日文[：:]\s*\n\s*(.+?)(?=\n\s*\*\*|$)',
            ]
            for i, pattern in enumerate(patterns):
                optimized_match = re.search(pattern, back_content_md, re.DOTALL | re.MULTILINE)
                if optimized_match:
                    optimized_text = optimized_match.group(1).strip()
                    # 清理可能的markdown格式标记
                    optimized_text = re.sub(r'^```.*?\n', '', optimized_text, flags=re.DOTALL)
                    optimized_text = re.sub(r'\n```.*?$', '', optimized_text, flags=re.DOTALL)
                    # 清理可能的列表标记和多余空白
                    optimized_text = re.sub(r'^[-*]\s+', '', optimized_text, flags=re.MULTILINE)
                    optimized_text = re.sub(r'\n\s*\n\s*\n+', '\n\n', optimized_text)  # 合并多个空行
                    optimized_text = optimized_text.strip()
                    logger.info(f"[_background_asr_transcribe] 使用模式 {i+1} 提取到优化后的日文，长度: {len(optimized_text)}, 前100字符: {optimized_text[:100]}...")
                    # 验证提取的文本是否合理（应该比原始文本长或相当，因为添加了标点）
                    if len(optimized_text) >= len(text_content) * 0.8:  # 至少是原始文本的80%
                        logger.info(f"[_background_asr_transcribe] 提取成功，使用优化后的文本作为正面内容")
                        break
                    else:
                        logger.warning(f"[_background_asr_transcribe] 提取的文本可能不完整（长度: {len(optimized_text)} vs 原始: {len(text_content)}），继续尝试其他模式")
            else:
                logger.warning("[_background_asr_transcribe] 未能从LLM返回中提取优化后的日文，使用原始文本")
                logger.debug(f"[_background_asr_transcribe] LLM返回的markdown前1000字符:\n{back_content_md[:1000]}")
                # 尝试从HTML格式的back_content中提取（作为备选方案）
                html_pattern = r'<b>优化后的日文[：:]</b>\s*<br>\s*(.+?)(?=<br><br>---|<b>中文翻译)'
                html_match = re.search(html_pattern, back_content, re.DOTALL | re.IGNORECASE)
                if html_match:
                    optimized_text = html_match.group(1).strip()
                    # 清理HTML标签
                    optimized_text = re.sub(r'<br\s*/?>', '\n', optimized_text, flags=re.IGNORECASE)
                    optimized_text = re.sub(r'<[^>]+>', '', optimized_text)  # 移除所有HTML标签
                    optimized_text = re.sub(r'\n\s*\n+', '\n', optimized_text)  # 合并多个换行
                    optimized_text = optimized_text.strip()
                    logger.info(f"[_background_asr_transcribe] 从HTML中提取到优化后的日文，长度: {len(optimized_text)}, 前100字符: {optimized_text[:100]}...")
            
            # 如果有优化后的文本和时间戳数据，将时间戳对齐到优化后的文本
            aligned_timestamps = timestamps or []
            logger.info(f"[_background_asr_transcribe] 检查对齐条件: optimized_text != text_content: {optimized_text != text_content}, timestamps存在: {bool(timestamps)}")
            if optimized_text != text_content and timestamps:
                logger.info("[_background_asr_transcribe] 开始将时间戳对齐到优化后的文本")
                logger.info(f"[_background_asr_transcribe] 原始文本长度: {len(text_content)}, 优化后文本长度: {len(optimized_text)}")
                logger.info(f"[_background_asr_transcribe] 原始时间戳数量: {len(timestamps)}")
                aligned_timestamps = self._align_timestamps_to_optimized_text(
                    original_text=text_content,
                    optimized_text=optimized_text,
                    original_timestamps=timestamps
                )
                logger.info(f"[_background_asr_transcribe] 时间戳对齐完成，原始: {len(timestamps)} 个，对齐后: {len(aligned_timestamps)} 个")
                if aligned_timestamps and len(aligned_timestamps) > 0:
                    logger.info(f"[_background_asr_transcribe] 对齐后第一个时间戳示例: {aligned_timestamps[0]}")
            else:
                logger.info(f"[_background_asr_transcribe] 跳过时间戳对齐: optimized_text == text_content: {optimized_text == text_content}, timestamps: {bool(timestamps)}")
            
            logger.info("[_background_asr_transcribe] LLM解释生成成功")
            
            return {
                "success": True,
                "isExistingCard": False,
                "frontContent": optimized_text,  # 使用优化后的文本作为正面内容
                "backContent": back_content,
                "audioBase64": "",  # 使用原始音频URL，不需要base64
                "audioFilename": "",  # 使用URL，不需要文件名
                "audioUrl": audio_url,  # 保存原始音频URL
                "timestamps": aligned_timestamps  # 对齐后的时间戳，用于交互式播放器
            }
            
        except Exception as e:
            logger.exception(f"Exception in _background_asr_transcribe: {e}")
            return {"success": False, "error": f"转写过程中发生异常: {str(e)}"}
    
    def _align_timestamps_to_optimized_text(self, original_text: str, optimized_text: str, 
                                            original_timestamps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        将原始时间戳对齐到优化后的文本
        
        Args:
            original_text: 原始ASR转写文本
            optimized_text: 优化后的文本（带标点符号）
            original_timestamps: 原始时间戳列表
        
        Returns:
            对齐后的时间戳列表
        """
        try:
            # 移除标点符号，得到纯文本用于对齐
            import string
            japanese_punctuation = '。、，？！：；'
            all_punctuation = string.punctuation + japanese_punctuation + ' '
            
            def remove_punctuation(text: str) -> str:
                """移除标点符号和空格"""
                return ''.join(c for c in text if c not in all_punctuation)
            
            original_clean = remove_punctuation(original_text)
            optimized_clean = remove_punctuation(optimized_text)
            
            # 构建原始文本的完整字符串（从时间戳）
            original_text_from_timestamps = ''.join(ts.get('text', '') for ts in original_timestamps)
            original_clean_from_ts = remove_punctuation(original_text_from_timestamps)
            
            # 如果纯文本相同，直接映射
            if original_clean == optimized_clean or original_clean_from_ts == optimized_clean:
                logger.info("[_align_timestamps_to_optimized_text] 纯文本相同，直接映射时间戳")
                # 将优化后的文本字符与原始时间戳对齐
                aligned_timestamps = []
                original_char_idx = 0
                
                # 构建字符到时间戳的映射（基于原始时间戳文本）
                char_to_ts = {}
                char_pos = 0
                for ts in original_timestamps:
                    word_text = ts.get('text', '')
                    for char in word_text:
                        if char not in all_punctuation:
                            char_to_ts[char_pos] = ts
                            char_pos += 1
                
                for char in optimized_text:
                    if char in all_punctuation:
                        # 标点符号：使用前一个字符的时间戳
                        if aligned_timestamps:
                            last_ts = aligned_timestamps[-1]
                            begin_time = last_ts.get('end_time', last_ts.get('begin_time', 0))
                            if not isinstance(begin_time, (int, float)):
                                begin_time = 0
                            aligned_timestamps.append({
                                'text': char,
                                'begin_time': int(begin_time),
                                'end_time': int(begin_time)
                            })
                        else:
                            # 如果第一个字符就是标点，使用第一个时间戳
                            if original_timestamps:
                                first_ts = original_timestamps[0]
                                begin_time = first_ts.get('begin_time', 0)
                                if not isinstance(begin_time, (int, float)):
                                    begin_time = 0
                                aligned_timestamps.append({
                                    'text': char,
                                    'begin_time': int(begin_time),
                                    'end_time': int(begin_time)
                                })
                    else:
                        # 非标点字符：从字符映射中获取时间戳
                        if original_char_idx in char_to_ts:
                            ts = char_to_ts[original_char_idx]
                            begin_time = ts.get('begin_time', 0)
                            end_time = ts.get('end_time', 0)
                            # 确保时间戳是数字类型
                            if not isinstance(begin_time, (int, float)):
                                begin_time = 0
                            if not isinstance(end_time, (int, float)):
                                end_time = begin_time
                            aligned_timestamps.append({
                                'text': char,
                                'begin_time': int(begin_time),
                                'end_time': int(end_time)
                            })
                            original_char_idx += 1
                        elif original_char_idx < len(original_clean_from_ts):
                            # 如果映射中没有，尝试使用下一个可用的时间戳
                            original_char_idx += 1
                        else:
                            # 超出范围，使用最后一个时间戳
                            if original_timestamps:
                                last_ts = original_timestamps[-1]
                                begin_time = last_ts.get('end_time', last_ts.get('begin_time', 0))
                                if not isinstance(begin_time, (int, float)):
                                    begin_time = 0
                                aligned_timestamps.append({
                                    'text': char,
                                    'begin_time': int(begin_time),
                                    'end_time': int(begin_time)
                                })
                
                return aligned_timestamps
            
            # 如果纯文本不同，使用更复杂的对齐算法
            logger.info("[_align_timestamps_to_optimized_text] 纯文本不同，使用字符级对齐")
            
            # 构建原始文本的字符到时间戳的映射
            char_to_timestamp = {}
            char_idx = 0
            for ts in original_timestamps:
                text = ts.get('text', '')
                for char in text:
                    if char not in all_punctuation:
                        char_to_timestamp[char_idx] = ts
                        char_idx += 1
            
            # 使用简单的字符级对齐
            aligned_timestamps = []
            original_char_idx = 0
            
            for char in optimized_text:
                if char in all_punctuation:
                    # 标点符号：使用前一个字符的时间戳
                    if aligned_timestamps:
                        last_ts = aligned_timestamps[-1]
                        begin_time = last_ts.get('end_time', last_ts.get('begin_time', 0))
                        if not isinstance(begin_time, (int, float)):
                            begin_time = 0
                        aligned_timestamps.append({
                            'text': char,
                            'begin_time': int(begin_time),
                            'end_time': int(begin_time)
                        })
                    elif original_char_idx < len(original_clean) and original_char_idx in char_to_timestamp:
                        ts = char_to_timestamp[original_char_idx]
                        begin_time = ts.get('begin_time', 0)
                        if not isinstance(begin_time, (int, float)):
                            begin_time = 0
                        aligned_timestamps.append({
                            'text': char,
                            'begin_time': int(begin_time),
                            'end_time': int(begin_time)
                        })
                else:
                    # 非标点字符：尝试在原始文本中找到对应位置
                    if original_char_idx < len(original_clean):
                        if original_char_idx in char_to_timestamp:
                            ts = char_to_timestamp[original_char_idx]
                            begin_time = ts.get('begin_time', 0)
                            end_time = ts.get('end_time', 0)
                            # 确保时间戳是数字类型
                            if not isinstance(begin_time, (int, float)):
                                begin_time = 0
                            if not isinstance(end_time, (int, float)):
                                end_time = begin_time
                            aligned_timestamps.append({
                                'text': char,
                                'begin_time': int(begin_time),
                                'end_time': int(end_time)
                            })
                        original_char_idx += 1
                    else:
                        # 超出原始文本范围，使用最后一个时间戳
                        if original_timestamps:
                            last_ts = original_timestamps[-1]
                            begin_time = last_ts.get('end_time', last_ts.get('begin_time', 0))
                            if not isinstance(begin_time, (int, float)):
                                begin_time = 0
                            aligned_timestamps.append({
                                'text': char,
                                'begin_time': int(begin_time),
                                'end_time': int(begin_time)
                            })
            
            return aligned_timestamps
            
        except Exception as e:
            logger.exception(f"[_align_timestamps_to_optimized_text] 对齐时间戳时发生异常: {e}")
            # 如果对齐失败，返回原始时间戳
            return original_timestamps
    
    def _on_asr_transcribe_complete(self, future) -> None:
        """ASR转写完成后的回调"""
        self.webview.eval("setLoading(false);")
        try:
            result = future.result()
            result_json = json.dumps(result)
            result_base64 = base64.b64encode(result_json.encode('utf-8')).decode('utf-8')
            self.webview.eval(f"displayPreviewFromBase64('{result_base64}');")
        except Exception as e:
            logger.exception(f"Error processing ASR result: {e}")
            self.webview.eval(f"displayTemporaryMessage('处理转写结果时出错: {e}', 'red', 5000);")

