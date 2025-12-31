# anki_gpt_addon/llm/generator.py
import hashlib
import os
import logging
import re

from .interfaces import LLMService, TTSService
from .utils import markdown_to_anki_html
from ..consts import ADDON_NAME

logger = logging.getLogger(ADDON_NAME)


class AnkiCardGenerator:
    def __init__(self, llm_service: LLMService, tts_service: TTSService):
        self.llm_service = llm_service
        self.tts_service = tts_service
        logger.debug(
            f"AnkiCardGenerator initialized with {llm_service.__class__.__name__} and {tts_service.__class__.__name__}.")

    def generate_card_content(self, japanese_sentence: str, output_audio_dir: str) -> tuple[
        str, str | None, list | None, str | None]:
        """
        生成卡片内容
        
        Returns:
            tuple: (back_content_html, audio_path, timestamps, kana_text)
            - back_content_html: 卡片背面内容（HTML格式）
            - audio_path: 音频文件路径
            - timestamps: 时间戳列表（基于假名）
            - kana_text: 用于TTS的假名文本（如果提取到的话）
        """
        logger.info(f"Starting card generation for: '{japanese_sentence}'")

        # 先调用 LLM 生成内容
        back_content_html = None
        back_content_md = None
        try:
            back_content_md = self.llm_service.generate_analysis(japanese_sentence)
            back_content_html = markdown_to_anki_html(back_content_md)
            logger.info("LLM content generation completed.")
        except Exception as e:
            logger.exception(f"LLM generation failed: {e}")
            back_content_html = None
            back_content_md = None

        # 如果 LLM 生成失败，直接返回
        if not back_content_html or not back_content_md:
            return back_content_html, None, None, None

        # 从 LLM 结果中提取句子读法的假名部分
        kana_text = self._extract_kana_from_llm_result(back_content_md)
        
        # 如果没有提取到假名，使用原始日文句子作为后备
        if not kana_text:
            logger.warning("未能从 LLM 结果中提取假名，使用原始日文句子作为 TTS 输入")
            kana_text = japanese_sentence
        else:
            logger.info(f"从 LLM 结果中提取到假名: '{kana_text}'")

        # 准备 TTS 输出路径
        audio_path = None
        timestamps = None
        
        if self.tts_service:
            # 使用提取的假名生成音频文件名（基于假名内容）
            audio_format = self.tts_service.audio_format
            filename = f"{hashlib.md5(kana_text.encode('utf-8')).hexdigest()}.{audio_format}"
            output_path = os.path.join(output_audio_dir, filename)
            
            # 调用 TTS 生成音频
            try:
                logger.info(f"Attempting to generate TTS audio with kana text: '{kana_text}'")
                success, timestamps = self.tts_service.synthesize_speech(kana_text, output_path)
                if success:
                    audio_path = output_path
                    logger.info(f"TTS generation successful. Timestamps received: {'Yes' if timestamps else 'No'}")
                else:
                    logger.warning("TTS generation failed.")
            except Exception as e:
                logger.exception(f"TTS generation failed with exception: {e}")
                audio_path = None
                timestamps = None

        return back_content_html, audio_path, timestamps, kana_text
    
    def _extract_kana_from_llm_result(self, markdown_content: str) -> str | None:
        """
        从 LLM 返回的 markdown 内容中提取句子读法的假名部分
        
        格式示例：
        **句子读法：**
        - そうですか、どうも。
        - Sō desu ka, dōmo.
        
        应该提取出：そうですか、どうも。（去掉前面的 -）
        
        Args:
            markdown_content: LLM 返回的 markdown 格式内容
        
        Returns:
            提取的假名文本，如果未找到则返回 None
        """
        if not markdown_content:
            return None
        
        # 方法1：使用正则表达式精确匹配
        # 匹配模式：**句子读法：** 或 **句子读法:** 或 句子读法： 后面跟着换行，然后是 - 开头的行（假名）
        patterns = [
            r'\*\*句子读法[：:]\*\*\s*\n\s*-\s*([^\n]+)',  # **句子读法：** 格式
            r'句子读法[：:]\s*\n\s*-\s*([^\n]+)',  # 句子读法： 格式（无**）
        ]
        
        for pattern in patterns:
            match = re.search(pattern, markdown_content, re.MULTILINE)
            if match:
                kana_text = match.group(1).strip()
                # 去掉可能的前导 - 符号（如果正则没有完全匹配）
                if kana_text.startswith('-'):
                    kana_text = kana_text[1:].strip()
                if kana_text:  # 确保提取到非空内容
                    logger.info(f"成功提取假名: '{kana_text}'")
                    return kana_text
        
        # 方法2：如果正则没匹配到，使用逐行查找（更宽松的模式）
        # 查找包含"句子读法"的行，然后找下一行以 - 开头的行
        lines = markdown_content.split('\n')
        in_reading_section = False
        for i, line in enumerate(lines):
            if '句子读法' in line:
                in_reading_section = True
                continue
            if in_reading_section:
                # 找到第一个以 - 开头的非空行
                stripped = line.strip()
                if stripped.startswith('-'):
                    kana_text = stripped[1:].strip()
                    if kana_text:  # 确保提取到非空内容
                        logger.info(f"成功提取假名（宽松模式）: '{kana_text}'")
                        return kana_text
                # 如果遇到下一个标题（**开头），说明已经过了句子读法部分
                if stripped.startswith('**') and '**' in stripped[2:]:
                    break
        
        logger.warning("未能从 LLM 结果中提取假名")
        return None