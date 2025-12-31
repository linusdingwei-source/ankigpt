# anki_gpt_addon/llm/providers/qwen_tts.py
import logging
import urllib.request
import urllib.error
import time
import dashscope

# 相对导入
from ..interfaces import TTSService
from ..utils import estimate_timestamps
from ...consts import ADDON_NAME

logger = logging.getLogger(ADDON_NAME)


class QwenTTSService(TTSService):
    """
    使用 DashScope Qwen-TTS 模型。
    此服务直接下载并保存 WAV 文件，并集成了时间戳估算功能。
    """

    def __init__(self, api_key: str, config: dict, ssml_config: dict, timestamp_enabled: bool):
        # ... (init 方法保持不变) ...
        self.api_key = api_key
        self.model = config.get("model", "qwen3-tts-flash")
        self.voice = config.get("voice", "Cherry")
        self.language_type = config.get("language_type", "Japanese")
        self.ssml_config = ssml_config
        self.timestamp_enabled = timestamp_enabled
        dashscope.api_key = self.api_key
        logger.debug(
            f"[{self.__class__.__name__}] Initialized with model='{self.model}', "
            f"voice='{self.voice}', estimation_enabled='{self.timestamp_enabled}'."
        )

    # 1. 实现新的接口属性
    @property
    def audio_format(self) -> str:
        return "wav"

    def synthesize_speech(self, text: str, output_path: str) -> tuple[bool, list | None]:
        """
        调用 API 合成语音，下载并保存 WAV 文件，然后估算时间戳。
        """
        try:
            logger.debug(f"[{self.__class__.__name__}] Calling Qwen-TTS for text: '{text[:30]}...'")

            response = dashscope.MultiModalConversation.call(
                model=self.model,
                text=text,
                voice=self.voice,
                language_type=self.language_type,
                api_key=self.api_key
            )

            if response.status_code == 200 and response.output and response.output.audio and response.output.audio.url:
                audio_url = response.output.audio.url
                logger.info(f"[{self.__class__.__name__}] Qwen-TTS API call successful. Audio URL received.")

                # 使用 urllib 下载音频文件（在 Anki 环境中更稳定）
                logger.debug(f"Downloading WAV audio from: {audio_url}")
                
                max_retries = 5  # 增加重试次数
                timeout = 30  # 30秒超时
                base_delay = 0.5  # 基础延迟（秒）
                
                for attempt in range(max_retries):
                    try:
                        # 在重试前添加延迟（指数退避）
                        if attempt > 0:
                            delay = base_delay * (2 ** (attempt - 1))  # 0.5s, 1s, 2s, 4s
                            logger.debug(f"Waiting {delay:.1f}s before retry...")
                            time.sleep(delay)
                        
                        logger.debug(f"Attempting download (attempt {attempt + 1}/{max_retries})")
                        
                        # 使用 urllib.request 下载文件
                        req = urllib.request.Request(audio_url)
                        req.add_header('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
                        
                        # 确保每次重试都创建新的连接
                        http_response = None
                        try:
                            http_response = urllib.request.urlopen(req, timeout=timeout)
                            
                            # 检查响应状态
                            if http_response.status == 200:
                                # 使用流式下载以处理大文件
                                with open(output_path, 'wb') as f:
                                    while True:
                                        chunk = http_response.read(8192)  # 8KB chunks
                                        if not chunk:
                                            break
                                        f.write(chunk)
                                
                                logger.info(f"WAV audio successfully saved to: {output_path}")
                                
                                timestamps = None
                                if self.timestamp_enabled:
                                    # 我们的估算器已经支持 WAV，所以这里可以无缝工作
                                    timestamps = estimate_timestamps(text, output_path, self.ssml_config, logger)
                                
                                return True, timestamps
                            else:
                                logger.error(f"Failed to download audio. HTTP Status: {http_response.status}")
                                if attempt == max_retries - 1:
                                    return False, None
                        finally:
                            # 确保连接被正确关闭
                            if http_response:
                                try:
                                    http_response.close()
                                except Exception:
                                    pass
                                
                    except urllib.error.URLError as e:
                        error_msg = str(e)
                        logger.warning(f"URL error (attempt {attempt + 1}/{max_retries}): {error_msg}")
                        
                        # 对于 Bad file descriptor 错误，增加更长的延迟
                        if "Bad file descriptor" in error_msg or "Errno 9" in error_msg:
                            if attempt < max_retries - 1:
                                extra_delay = 1.0 * (attempt + 1)  # 额外延迟：1s, 2s, 3s...
                                logger.debug(f"Bad file descriptor detected, adding extra delay: {extra_delay:.1f}s")
                                time.sleep(extra_delay)
                        
                        if attempt == max_retries - 1:
                            logger.error(f"Failed to download audio after {max_retries} attempts: {e}")
                            return False, None
                    except OSError as e:
                        error_msg = str(e)
                        logger.warning(f"OS error during download (attempt {attempt + 1}/{max_retries}): {error_msg}")
                        
                        # 对于文件描述符相关的错误，增加延迟
                        if "Bad file descriptor" in error_msg or "Errno 9" in error_msg:
                            if attempt < max_retries - 1:
                                extra_delay = 1.0 * (attempt + 1)
                                logger.debug(f"File descriptor error detected, adding extra delay: {extra_delay:.1f}s")
                                time.sleep(extra_delay)
                        
                        if attempt == max_retries - 1:
                            logger.error(f"Failed to download audio after {max_retries} attempts: {e}")
                            return False, None
                    except Exception as e:
                        logger.warning(f"Unexpected error during download (attempt {attempt + 1}/{max_retries}): {e}")
                        if attempt == max_retries - 1:
                            logger.error(f"Failed to download audio after {max_retries} attempts: {e}")
                            return False, None
                
                logger.error("Failed to download audio after all retries")
                return False, None
            else:
                error_msg = f"Qwen-TTS API call failed. Status: {response.status_code}, Code: {response.code}, Message: {response.message}"
                logger.error(f"[{self.__class__.__name__}] {error_msg}")
                return False, None

        except Exception as e:
            logger.exception(f"An unexpected exception occurred during Qwen-TTS process: {e}")
            return False, None