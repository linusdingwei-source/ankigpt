# anki_gpt_addon/consts.py
"""
常量定义模块
包含插件使用的所有常量，包括字段名、默认值等
"""
ADDON_NAME = "anki-gpt20"

# 默认字段名（用于不同卡片类型）
DEFAULT_FIELD_NAMES = {
    "正面": "正面",
    "背面": "背面",
    "Audio": "Audio",
    "发音": "发音",  # 备用字段名
    "Timestamps": "Timestamps",
    "Front": "Front",  # Basic卡片类型
    "Back": "Back"  # Basic卡片类型
}

# 支持的卡片类型
SUPPORTED_CARD_TYPES = {
    "问答题（附翻转卡片）": {
        "front_field": "正面",
        "back_field": "背面",
        "audio_field": "Audio"
    },
    "Basic-b860c": {
        "front_field": "Front",
        "back_field": "Back",
        "audio_field": "Back"  # Basic卡片将音频放在背面
    }
}