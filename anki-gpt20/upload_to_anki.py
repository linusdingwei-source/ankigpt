# anki_gpt_addon/upload_to_anki.py
"""
Anki 卡片上传模块
负责将生成的卡片内容上传到 Anki 集合中
"""
import json
import logging
import os
from typing import Optional, List
from aqt import mw  # 导入 Anki 主窗口对象，用于访问集合 (collection)
from .consts import SUPPORTED_CARD_TYPES

logger = logging.getLogger(__name__)
# --- 辅助函数：确保牌组存在 ---
def ensure_deck_exists(deck_name: str) -> Optional[int]:
    """
    确保指定的 Anki 牌组存在。如果不存在，则创建它。
    返回牌组的 ID，如果失败则返回 None。
    """
    try:
        # 尝试获取牌组 ID
        deck_id = mw.col.decks.id(deck_name)
        if deck_id == 0:  # 如果牌组不存在
            deck_id = mw.col.decks.add_deck(deck_name)
            mw.col.save()  # 保存集合以确保新牌组被保存
            logger.info(f"Created new deck: '{deck_name}' with ID: {deck_id}")
        else:
            logger.info(f"Found existing deck: '{deck_name}' with ID: {deck_id}")
        return deck_id
    except Exception as e:
        logger.error(f"Error ensuring deck '{deck_name}': {e}")
        return None
# --- 辅助函数：查找现有笔记 ---
def find_notes_by_field(query_field: str, query_value: str, model_name: str) -> List[int]:
    """
    通过指定字段和值查找 Anki 中现有笔记的 ID。
    """
    # 在 Anki 内部，直接使用 mw.col.find_notes
    # 注意：这里假设你的笔记模型中有一个字段名为 query_field
    # 并且你希望查找该字段值为 query_value 的笔记
    # 还需要指定笔记模型名称
    try:
        # 构建查询字符串
        # 例如： "note:MyModel field:MyField::MyValue"
        search_query = f"note:{model_name} {query_field}:\"{query_value}\""
        note_ids = mw.col.find_notes(search_query)
        logger.debug(f"Found {len(note_ids)} notes for query '{search_query}'")
        return note_ids
    except Exception as e:
        logger.error(f"Error finding notes by field '{query_field}' with value '{query_value}': {e}")
        return []
# --- 主上传函数 ---
def upload_anki(
        word_or_sentence: str,
        back_content: str,
        card_type: str,
        audio_file_path: Optional[str] = None,
        deck_name: str = "japanese-llm-cards"
) -> Optional[List[int]]:
    """
    将生成的卡片内容上传到 Anki。
    Args:
        word_or_sentence (str): 卡片正面内容（日文句子或单词）。
        back_content (str): 卡片背面内容（翻译、解释等，HTML 格式）。
        card_type (str): 卡片类型（笔记模型名称）。
        audio_file_path (str | None): 音频文件的绝对路径，如果存在。
        deck_name (str): 目标牌组名称。
    Returns:
        list[int] | None: 成功创建的笔记 ID 列表，如果失败则为 None。
    """
    try:
        # 1. 确保牌组存在
        deck_id = ensure_deck_exists(deck_name)
        if deck_id is None:
            logger.error(f"Failed to ensure deck '{deck_name}' exists.")
            return None
        # 2. 处理音频文件
        audio_html = ""
        if audio_file_path and os.path.exists(audio_file_path):
            # 将音频文件添加到 Anki 媒体集合
            # mw.col.media.add_file(path) 会将文件复制到媒体文件夹并返回文件名
            anki_media_filename = mw.col.media.add_file(audio_file_path)
            if anki_media_filename:
                audio_html = f"[sound:{anki_media_filename}]"
                logger.info(f"Audio file '{audio_file_path}' added to Anki media as '{anki_media_filename}'.")
            else:
                logger.warning(f"Failed to add audio file '{audio_file_path}' to Anki media.")
        elif audio_file_path:
            logger.warning(f"Audio file path provided but file does not exist: {audio_file_path}")
        # 3. 准备笔记字段
        card_config = SUPPORTED_CARD_TYPES.get(card_type)
        if not card_config:
            logger.error(f"Unsupported card type: {card_type}. Supported types: {list(SUPPORTED_CARD_TYPES.keys())}")
            return None
        
        front_field = card_config['front_field']
        back_field = card_config['back_field']
        audio_field = card_config['audio_field']
        
        fields = {front_field: word_or_sentence}
        
        # 根据卡片类型决定音频放置位置
        if audio_field == back_field:
            # Basic卡片：音频放在背面
            fields[back_field] = f"{audio_html}<br>{back_content}"
        else:
            # 问答题类型：音频放在独立字段
            fields[back_field] = back_content
            fields[audio_field] = audio_html
        # 4. 创建 Anki 笔记对象
        # 获取笔记模型
        model = mw.col.models.by_name(card_type)
        if not model:
            logger.error(f"Note type '{card_type}' not found.")
            return None
        note = mw.col.new_note(model)
        note.did = deck_id  # 设置牌组 ID
        for field_name, field_value in fields.items():
            if field_name in note.keys():  # 检查字段是否存在于笔记模型中
                note[field_name] = field_value
            else:
                logger.warning(f"Field '{field_name}' not found in note type '{card_type}'. Skipping.")
        # 5. 添加笔记到集合
        mw.col.add_note(note, deck_id)  # 传入 note 和 deck_id
        mw.col.save()  # 保存集合以确保新笔记被保存
        logger.info(f"Successfully added note for '{word_or_sentence}' to deck '{deck_name}'. Note ID: {note.id}")
        return [note.id]  # 返回新笔记的 ID 列表
    except Exception as e:
        logger.error(f"Error uploading Anki card for '{word_or_sentence}': {e}", exc_info=True)
        return None