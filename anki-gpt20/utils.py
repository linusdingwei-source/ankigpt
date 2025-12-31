# anki_gpt_addon/utils.py
"""
通用工具函数模块
包含跨模块使用的工具函数
"""
import base64
import os
from typing import Optional


def encode_audio_to_base64(audio_path: str, mime_type: str = "audio/mpeg") -> Optional[str]:
    """
    将音频文件编码为 base64 数据 URI
    
    Args:
        audio_path: 音频文件的路径
        mime_type: MIME 类型，默认为 "audio/mpeg" (MP3)
                   对于 WAV 文件，应使用 "audio/wav"
    
    Returns:
        编码后的 base64 数据 URI 字符串，如果文件不存在则返回 None
    """
    if not audio_path or not os.path.exists(audio_path):
        return None
    
    try:
        with open(audio_path, 'rb') as f:
            audio_data = f.read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            return f"data:{mime_type};base64,{audio_base64}"
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to encode audio file to base64: {e}")
        return None


def get_audio_mime_type(audio_path: str) -> str:
    """
    根据音频文件扩展名返回对应的 MIME 类型
    
    Args:
        audio_path: 音频文件路径
    
    Returns:
        MIME 类型字符串
    """
    ext = os.path.splitext(audio_path)[1].lower()
    mime_types = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4'
    }
    return mime_types.get(ext, 'audio/mpeg')  # 默认为 MP3

