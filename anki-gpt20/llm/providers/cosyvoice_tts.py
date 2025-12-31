# anki_gpt_addon/llm/providers/cosyvoice_tts.py
import logging
import html
import json
from io import BytesIO
import threading
import dashscope
from dashscope.audio.tts_v2 import SpeechSynthesizer, AudioFormat, ResultCallback

# 相对导入
from ..interfaces import TTSService
from ..utils import estimate_timestamps
from ...consts import ADDON_NAME

logger = logging.getLogger(ADDON_NAME)

# --- CosyVoice TTS 模型和配置常量 ---
COSYVOICE_TTS_MODEL = "cosyvoice-v2"
COSYVOICE_TTS_VOICE = "loongyuuna_v2"  # 默认音色
COSYVOICE_TTS_AUDIO_FORMAT = AudioFormat.MP3_44100HZ_MONO_256KBPS


class CosyVoiceTTSService(TTSService):
    """
    使用 DashScope CosyVoice-v2 TTS 服务 (SpeechSynthesizer 接口) 实现 TTSService。
    支持 API 返回的字级别时间戳，并集成了估算功能作为后备。
    """

    def __init__(self, api_key: str, model: str = COSYVOICE_TTS_MODEL, voice: str = COSYVOICE_TTS_VOICE,
                 audio_format: str = COSYVOICE_TTS_AUDIO_FORMAT, ssml_config: dict | None = None,
                 timestamp_enabled: bool = False):
        self.api_key = api_key
        self.model = model
        self.voice = voice
        self._audio_format = audio_format  # 存储为私有变量，因为 audio_format 是只读 property
        self.ssml_config = ssml_config if ssml_config is not None else {}
        self.timestamp_enabled = timestamp_enabled
        dashscope.api_key = self.api_key
        logger.debug(
            f"[{self.__class__.__name__}] Initialized with model='{self.model}', voice='{self.voice}'. "
            f"SSML: {self.ssml_config.get('enabled', False)}, Timestamps: {self.timestamp_enabled}")

    def _plain_text_to_ssml(self, text: str) -> str:
        """将普通文本根据规则转换为 SSML 格式的文本。"""
        import re
        rules = self.ssml_config.get("rules", {})
        if not rules:
            return f"<speak>{html.escape(text)}</speak>"

        processed_text = html.escape(text)
        for punc, time_str in rules.items():
            replacement = f'<break time="{time_str}"/>'
            # 使用 re.sub 确保只替换一次，避免嵌套替换问题
            processed_text = processed_text.replace(punc, replacement)

        ssml_text = f"<speak>{processed_text}</speak>"
        logger.debug(f"Converted to SSML: {ssml_text}")
        return ssml_text

    @property
    def audio_format(self) -> str:
        """返回音频格式后缀"""
        return "mp3"

    def synthesize_speech(self, text: str, output_path: str) -> tuple[bool, list | None]:
        """
        调用 CosyVoice-v2 API 合成语音。如果 API 未返回时间戳，则调用共享工具进行估算。
        """
        final_text_for_api = text
        if self.ssml_config.get("enabled", False):
            final_text_for_api = self._plain_text_to_ssml(text)

        class TtsCallback(ResultCallback):
            def __init__(self):
                self.audio_buffer = BytesIO()
                self.timestamps = []
                self.error_message = None
                self.finished_event = threading.Event()

            def on_open(self):
                logger.debug("CosyVoice TTS WebSocket connection opened.")

            def on_data(self, data: bytes):
                self.audio_buffer.write(data)

            def on_complete(self):
                logger.debug("CosyVoice TTS synthesis stream completed.")

            def on_error(self, message: str):
                logger.error(f"CosyVoice TTS synthesis error: {message}")
                self.error_message = message
                self.finished_event.set()

            def on_close(self):
                logger.debug("CosyVoice TTS WebSocket connection closed.")
                self.finished_event.set()

            def on_event(self, message: str):
                try:
                    json_data = json.loads(message)
                    if 'payload' in json_data and 'output' in json_data['payload'] and 'sentence' in \
                            json_data['payload']['output']:
                        sentence_data = json_data['payload']['output']['sentence']
                        if sentence_data.get('words'):
                            self.timestamps.extend(sentence_data['words'])
                except Exception as e:
                    logger.error(f"Error processing timestamp event: {e}")

        callback = TtsCallback()

        additional_params = {'word_timestamp_enabled': self.timestamp_enabled}
        if self.ssml_config.get("enabled", False):
            additional_params['enable_ssml'] = True

        try:
            logger.debug(
                f"[{self.__class__.__name__}] Synthesizing speech with CosyVoice-v2. "
                f"Timestamps: {self.timestamp_enabled}, SSML: {additional_params.get('enable_ssml', False)}")

            synthesizer = SpeechSynthesizer(
                model=self.model, voice=self.voice, format=self._audio_format,
                callback=callback, additional_params=additional_params
            )

            synthesizer.call(final_text_for_api)

            logger.debug("Waiting for CosyVoice TTS callback to finish...")
            callback.finished_event.wait()
            logger.debug("CosyVoice TTS callback finished.")

            if callback.error_message:
                raise Exception(f"CosyVoice TTS service returned an error: {callback.error_message}")

            audio_data = callback.audio_buffer.getvalue()
            timestamps = callback.timestamps if self.timestamp_enabled and callback.timestamps else None

            if audio_data:
                with open(output_path, 'wb') as f:
                    f.write(audio_data)

                # 如果 API 未返回时间戳，则调用共享的估算函数
                if self.timestamp_enabled and not timestamps:
                    timestamps = estimate_timestamps(text, output_path, self.ssml_config, logger)

                logger.info(
                    f"CosyVoice-v2 audio successfully saved to: {output_path}. "
                    f"Timestamps {'found' if timestamps else 'not found'}.")
                return True, timestamps
            else:
                logger.warning("CosyVoice TTS synthesis failed, no audio data received in buffer.")
                return False, None

        except Exception as e:
            logger.exception(f"Failed to generate or save CosyVoice-v2 audio: {e}")
            return False, None

