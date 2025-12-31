# anki_gpt_addon/tests/test_upload_to_anki.py
"""
upload_to_anki 模块的单元测试
包含模拟对象和测试用例
"""
import json
import logging
import os
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 设置日志
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# --- 模拟对象定义 ---
class MockMedia:
    """模拟 Anki 媒体对象"""
    def __init__(self, media_dir: str = "/tmp/mock_anki_media"):
        self._media_dir = media_dir
        os.makedirs(media_dir, exist_ok=True)
    
    def dir(self) -> str:
        return self._media_dir
    
    def add_file(self, path: str) -> str:
        """
        模拟将文件复制到媒体文件夹
        
        Args:
            path: 源文件路径
        
        Returns:
            目标文件名
        """
        filename = os.path.basename(path)
        dest_path = os.path.join(self._media_dir, filename)
        if os.path.exists(path):
            with open(path, 'rb') as src, open(dest_path, 'wb') as dst:
                dst.write(src.read())
            logger.info(f"Mocked adding file {path} to media as {filename}")
        return filename


class MockDecks:
    """模拟 Anki 牌组对象"""
    def __init__(self):
        self._decks: dict[str, int] = {}  # {name: id}
        self._next_id = 1
    
    def id(self, name: str) -> int:
        """获取牌组 ID，如果不存在返回 0"""
        return self._decks.get(name, 0)
    
    def add_deck(self, name: str) -> int:
        """创建新牌组"""
        if name not in self._decks:
            self._decks[name] = self._next_id
            self._next_id += 1
            logger.info(f"Mocked creating deck '{name}' with ID {self._decks[name]}")
        return self._decks[name]


class MockNoteModel:
    """模拟 Anki 笔记模型"""
    def __init__(self, name: str, fields: list[str]):
        self.name = name
        self._fields = {f: i for i, f in enumerate(fields)}
    
    def keys(self):
        return self._fields.keys()


class MockModels:
    """模拟 Anki 模型集合"""
    def __init__(self):
        self._models = {
            "Basic-b860c": MockNoteModel("Basic-b860c", ["Front", "Back"]),
            "问答题（附翻转卡片）": MockNoteModel("问答题（附翻转卡片）", ["正面", "背面", "Audio"])
        }
    
    def by_name(self, name: str) -> MockNoteModel | None:
        """根据名称获取模型"""
        return self._models.get(name)


class MockNote:
    """模拟 Anki 笔记对象"""
    _next_id = 1000
    
    def __init__(self, model: MockNoteModel):
        self.id = MockNote._next_id
        MockNote._next_id += 1
        self.model = model
        self._fields = {f: "" for f in model.keys()}
        self.did = 0  # 模拟 note.did 属性
    
    def __setitem__(self, key: str, value: str):
        if key in self._fields:
            self._fields[key] = value
        else:
            raise KeyError(f"Field '{key}' not in model '{self.model.name}'")
    
    def __getitem__(self, key: str) -> str:
        return self._fields[key]
    
    def keys(self):
        return self._fields.keys()
    
    def note_type(self) -> dict:
        """返回笔记类型信息"""
        return {"name": self.model.name, "flds": [{"name": f, "ord": i} for i, f in enumerate(self.model.keys())]}


class MockCol:
    """模拟 Anki 集合对象"""
    def __init__(self):
        self.decks = MockDecks()
        self.media = MockMedia()
        self.models = MockModels()
        self._notes: list[MockNote] = []
    
    def new_note(self, model: MockNoteModel) -> MockNote:
        """创建新笔记"""
        return MockNote(model)
    
    def add_note(self, note: MockNote, deck_id: int) -> None:
        """添加笔记到集合"""
        note.did = deck_id
        self._notes.append(note)
        logger.info(f"Mocked adding note ID {note.id} to deck {deck_id}")
    
    def find_notes(self, query: str) -> list[int]:
        """模拟查找笔记"""
        logger.info(f"Mocked finding notes with query: {query}")
        # 简单模拟，总是返回一个假 ID
        return [1001]
    
    def save(self) -> None:
        """模拟保存集合"""
        logger.info("Mocked collection save.")


# --- 测试函数 ---
def test_upload_anki():
    """测试 upload_anki 函数"""
    # 创建模拟对象
    mock_mw = type('MockMW', (), {
        'col': MockCol()
    })()
    
    # 临时替换全局 mw 对象
    import anki_gpt20.upload_to_anki as upload_module
    original_mw = upload_module.mw
    upload_module.mw = mock_mw
    
    try:
        # 创建模拟音频文件
        mock_audio_path = "/tmp/test_audio.mp3"
        with open(mock_audio_path, "wb") as f:
            f.write(b"mock audio content")
        
        # 测试上传
        note_ids = upload_module.upload_anki(
            word_or_sentence="テスト",
            back_content="<b>テスト</b>：試験",
            card_type="问答题（附翻转卡片）",
            audio_file_path=mock_audio_path,
            deck_name="japanese-llm-cards"
        )
        
        if note_ids:
            print(f"✓ 模拟上传成功，笔记ID: {note_ids}")
        else:
            print("✗ 模拟上传失败。")
        
        # 清理模拟音频文件
        if os.path.exists(mock_audio_path):
            os.remove(mock_audio_path)
        
        # 清理媒体目录
        media_dir = mock_mw.col.media.dir()
        if os.path.exists(media_dir):
            for f in os.listdir(media_dir):
                os.remove(os.path.join(media_dir, f))
            os.rmdir(media_dir)
    
    finally:
        # 恢复原始 mw 对象
        upload_module.mw = original_mw


if __name__ == "__main__":
    print("--- 独立测试 upload_to_anki.py ---")
    test_upload_anki()

