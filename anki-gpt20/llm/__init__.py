# 文件路径: anki-gpt20/llm/__init__.py

import logging
# 相对导入
from .generator import AnkiCardGenerator
from .providers.dashscope import DashScopeLLMService
from .providers.cosyvoice_tts import CosyVoiceTTSService
from .providers.qwen_tts import QwenTTSService
from .providers.dashscope_asr import DashScopeASRService
from .utils import estimate_timestamps  # <<< 核心修正：从 utils.py 导入 estimate_timestamps 函数

from ..consts import ADDON_NAME

# 定义此模块对外暴露的成员
# <<< 优化建议：将 estimate_timestamps 加入 __all__ 列表，保持代码清晰
__all__ = ["get_anki_card_content_from_llm", "estimate_timestamps", "DashScopeASRService"]

logger = logging.getLogger(ADDON_NAME)


def get_anki_card_content_from_llm(japanese_sentence: str, output_audio_dir: str, api_key: str,
                                   config: dict | None = None) -> tuple[str, str | None, list | None, str | None]:
    """
    使用大模型生成 Anki 卡片背面内容，并使用 TTS 生成语音及时间戳。
    此函数作为对外的统一接口，内部根据配置动态选择并协调所需的服务。

    Args:
        japanese_sentence (str): 要处理的日文句子。
        output_audio_dir (str): 音频文件保存的目录 (Anki 媒体目录)。
        api_key (str): DashScope API Key。
        config (dict | None): 插件的完整配置字典。

    Returns:
        tuple[str, str | None, list | None, str | None]: 一个元组，包含：
            - HTML 内容 (str)
            - 音频文件路径 (str | None)
            - 时间戳数据 (list | None，基于假名)
            - 假名文本 (str | None，用于TTS的假名)
    """
    logger.info(f"[llm] Received request for sentence: '{japanese_sentence}'")
    logger.debug(f"[llm] Received API Key: (first 5 chars: {api_key[:5] if api_key else 'N/A'})")

    if not api_key:
        error_msg = "错误：API KEY 为空或 None。请在 Anki-GPT 插件配置中设置。"
        logger.error(f"[llm] {error_msg}")
        return error_msg, None, None

    if config is None:
        config = {}

    # --- 服务实例化（工厂部分）---
    llm_provider = DashScopeLLMService(api_key=api_key)

    tts_provider_name = config.get("tts_provider", "cosyvoice-v2")
    tts_provider = None

    ssml_config = config.get("ssml_options", {})
    timestamp_enabled = config.get("interactive_player_enabled", False)

    if tts_provider_name == "qwen-tts":
        logger.info("[llm] Using Qwen-TTS provider.")
        qwen_tts_config = config.get("qwen_tts_options", {})
        tts_provider = QwenTTSService(
            api_key=api_key,
            config=qwen_tts_config,
            ssml_config=ssml_config,
            timestamp_enabled=timestamp_enabled
        )
    elif tts_provider_name == "cosyvoice-v2":
        logger.info("[llm] Using CosyVoice-v2 provider.")
        cosyvoice_config = config.get("cosyvoice_tts_options", {})
        model = cosyvoice_config.get("model", "cosyvoice-v2")
        voice = cosyvoice_config.get("voice", "loongyuuna_v2")
        tts_provider = CosyVoiceTTSService(
            api_key=api_key,
            model=model,
            voice=voice,
            ssml_config=ssml_config,
            timestamp_enabled=timestamp_enabled
        )
    else:  # 兼容旧配置，默认为 cosyvoice-v2
        logger.warning(f"[llm] Unknown TTS provider '{tts_provider_name}', using default CosyVoice-v2.")
        tts_provider = CosyVoiceTTSService(
            api_key=api_key,
            ssml_config=ssml_config,
            timestamp_enabled=timestamp_enabled
        )

    # --- 实例化协调器并注入服务 ---
    card_generator = AnkiCardGenerator(llm_service=llm_provider, tts_service=tts_provider)

    # --- 执行生成任务 ---
    return card_generator.generate_card_content(japanese_sentence, output_audio_dir)