# 文件路径: anki-gpt20/llm/utils.py

import logging
import html
import re
import os
import mutagen
from mutagen.wave import WAVE
from mutagen.mp3 import MP3
from mutagen.flac import FLAC

def markdown_to_anki_html(markdown_text: str) -> str:
    """
    将 Markdown 格式转换为 Anki 友好的 HTML 格式。
    """
    html_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', markdown_text)
    html_text = html_text.replace('\n', '<br>')
    return html_text

def estimate_timestamps(text: str, audio_path: str, ssml_config: dict, logger: logging.Logger) -> list | None:
    """
    根据音频总时长和文本内容，估算每个字符的时间戳。
    此版本使用基于文件后缀的精确解析器，以避免自动检测失败。
    """
    logger.info("API did not return timestamps. Attempting to estimate them.")
    if not os.path.exists(audio_path):
        logger.error(f"Cannot estimate timestamps: Audio file not found at '{audio_path}'.")
        return None

    try:
        file_ext = os.path.splitext(audio_path)[1].lower()
        if file_ext == '.wav':
            audio = WAVE(audio_path)
        elif file_ext == '.mp3':
            audio = MP3(audio_path)
        elif file_ext == '.flac':
            audio = FLAC(audio_path)
        else:
            logger.warning(f"Unknown extension '{file_ext}'. Attempting generic load.")
            audio = mutagen.File(audio_path)
            if not audio:
                raise mutagen.MutagenError(f"Could not recognize format for unknown extension file: {audio_path}")
        total_duration_ms = audio.info.length * 1000
    except Exception as e:
        logger.error(f"Failed to read audio duration with mutagen: {e}")
        return None

    char_weights = {'sokuon': 0.7, 'long_vowel': 0.8, 'yoon': 0.3, 'kana': 1.0}
    total_pause_ms = 0
    total_speech_weight = 0
    ssml_rules = ssml_config.get("rules", {})
    tokens = [text]

    if ssml_rules:
        split_pattern = f"([{''.join(re.escape(k) for k in ssml_rules.keys())}])"
        tokens = [t for t in re.split(split_pattern, text) if t]

    for token in tokens:
        if token in ssml_rules:
            try:
                match = re.match(r'(\d+)', ssml_rules[token])
                if match: total_pause_ms += int(match.group(1))
            except (ValueError, TypeError):
                continue
        else:
            for char in token:
                weight = char_weights['kana']
                if char in 'っッ':
                    weight = char_weights['sokuon']
                elif char == 'ー':
                    weight = char_weights['long_vowel']
                elif char in 'ゃゅょャュョ':
                    weight = char_weights['yoon']
                total_speech_weight += weight

    net_speech_duration_ms = total_duration_ms - total_pause_ms
    if net_speech_duration_ms <= 0 or total_speech_weight == 0:
        logger.warning(
            f"Cannot estimate timestamps: Invalid net speech duration ({net_speech_duration_ms:.2f}ms) or total speech weight ({total_speech_weight:.2f}).")
        return None

    time_per_weight_unit = net_speech_duration_ms / total_speech_weight
    timestamps = []
    current_time_ms = 0.0

    for token in tokens:
        if token in ssml_rules:
            try:
                match = re.match(r'(\d+)', ssml_rules[token])
                if match: current_time_ms += int(match.group(1))
            except (ValueError, TypeError):
                continue
        else:
            for char in token:
                weight = char_weights['kana']
                if char in 'っッ':
                    weight = char_weights['sokuon']
                elif char == 'ー':
                    weight = char_weights['long_vowel']
                elif char in 'ゃゅょャュョ':
                    weight = char_weights['yoon']
                char_duration = weight * time_per_weight_unit
                timestamps.append({"text": char, "begin_time": round(current_time_ms),
                                   "end_time": round(current_time_ms + char_duration)})
                current_time_ms += char_duration

    logger.info(f"Successfully estimated {len(timestamps)} timestamps for audio of {total_duration_ms:.2f}ms.")
    return timestamps