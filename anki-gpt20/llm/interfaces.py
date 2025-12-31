# anki_gpt_addon/llm/interfaces.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

class LLMService(ABC):
    @abstractmethod
    def generate_analysis(self, japanese_sentence: str) -> str:
        pass

class TTSService(ABC):
    @property
    @abstractmethod
    def audio_format(self) -> str:
        """返回此服务生成的音频格式后缀 (例如 'mp3' 或 'wav')。"""
        pass

    @abstractmethod
    def synthesize_speech(self, text: str, output_path: str) -> tuple[bool, list | None]:
        pass

class ASRService(ABC):
    """音频转文字服务抽象基类"""
    
    @abstractmethod
    def transcribe(self, audio_url: str, language_hints: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        将音频转换为文字
        
        Args:
            audio_url: 音频文件的URL地址
            language_hints: 语言提示列表（可选）
        
        Returns:
            包含转写结果的字典，格式为：
            {
                "success": bool,
                "text": str,  # 转写后的文本
                "timestamps": Optional[List[Dict]],  # 时间戳数据（可选）
                "error": Optional[str]  # 错误信息（如果失败）
            }
        """
        pass