# dialog/utils.py - 对话框辅助函数

from aqt import mw


def get_note_type_names():
    """获取所有卡片模板名称的辅助函数"""
    if mw and mw.col:
        return sorted([nt['name'] for nt in mw.col.models.all()])
    return []


def get_deck_names():
    """获取所有牌组名称的辅助函数"""
    if mw and mw.col:
        # 使用 all_names_and_ids() 替代废弃的 all_names()
        return sorted([d.name for d in mw.col.decks.all_names_and_ids()])
    return []

