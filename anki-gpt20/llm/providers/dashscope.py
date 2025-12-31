# anki_gpt_addon/llm/providers/dashscope.py
import logging
import dashscope
from dashscope import Generation

# 相对导入
from ..interfaces import LLMService
from ...consts import ADDON_NAME

logger = logging.getLogger(ADDON_NAME)

# --- DashScope LLM 模型常量 ---
DASHSCOPE_LLM_MODEL = "qwen-plus"


class DashScopeLLMService(LLMService):
    # 此类保持不变，无需修改
    def __init__(self, api_key: str, model: str = DASHSCOPE_LLM_MODEL):
        self.api_key = api_key
        self.model = model
        dashscope.api_key = self.api_key
        logger.debug(f"[{self.__class__.__name__}] Initialized with model '{self.model}'.")

    def generate_analysis(self, japanese_sentence: str, is_asr_text: bool = False) -> str:
        """
        生成分析内容
        
        Args:
            japanese_sentence: 日文句子
            is_asr_text: 是否为ASR转写的文本（可能缺少标点符号）
        
        Returns:
            分析内容的markdown文本
        """
        prompt = self._build_prompt(japanese_sentence, is_asr_text=is_asr_text)
        try:
            logger.debug(f"[{self.__class__.__name__}] Calling LLM for analysis... (is_asr_text={is_asr_text})")
            response = Generation.call(model=self.model, messages=prompt, result_format="message")
            if response.status_code == 200:
                return response.output.choices[0].message.content
            else:
                error_msg = f"LLM API call failed. Status: {response.status_code}, Code: {response.code}, Message: {response.message}"
                logger.error(f"[{self.__class__.__name__}] {error_msg}")
                return f"大模型分析失败：{response.message}"
        except Exception as e:
            logger.exception(f"[{self.__class__.__name__}] An exception occurred during LLM call: {e}")
            return f"大模型分析时发生异常：{e}"

    def _build_prompt(self, japanese_sentence: str, is_asr_text: bool = False) -> list[dict]:
        """
        构建LLM提示词
        
        Args:
            japanese_sentence: 日文句子
            is_asr_text: 是否为ASR转写的文本（可能缺少标点符号）
        """
        if is_asr_text:
            # ASR转写文本的特殊处理：先优化标点符号
            system_content = "你是一个有帮助的助手，擅长处理日文音频转写文本。音频转写文本可能缺少标点符号或标点混乱，你需要先优化标点符号，然后进行翻译和语言分析。"
            user_content = f"""以下是从日文音频转写得到的文本，可能缺少标点符号或标点混乱。请先优化标点符号，然后进行翻译和语言分析。

请按照以下格式输出：
**优化后的日文：**
[优化标点符号后的完整日文句子]

**中文翻译：**
[翻译结果]

**句子读法：**
- [句子假名读音]
- [句子罗马文读音]

**单词解释：**
- [日文单词]（[假名读音]）（[罗马文读音]）：[中文意思]
... (列出句子中的主要单词及其假名读音和中文解释)

**语法点解释：**
- [日文语法点]（[假名读音]）（[罗马文读音]）：[解释]
... (列出句子中的主要语法点及其解释)

转写文本：
{japanese_sentence}
"""
        else:
            # 普通文本处理
            system_content = "你是一个有帮助的助手，擅长将日文翻译成中文，并能对日文句子进行详细的语言分析，包括单词的假名读音、罗马文读音、中文解释和语法点解释。"
            user_content = f"""请将以下日文句子翻译成中文。在翻译之后，请对句子中的主要单词和语法点进行详细解释。请按照以下格式输出：
**中文翻译：**
[翻译结果]
**句子读法：**
- [句子假名读音]
- [句子罗马文读音]
**单词解释：**
- [日文单词]（[假名读音]）（[罗马文读音]）：[中文意思]
... (列出句子中的主要单词及其假名读音和中文解释)
**语法点解释：**
- [日文语法点]（[假名读音]）（[罗马文读音]）：[解释]
... (列出句子中的主要语法点及其解释)
日文句子：
{japanese_sentence}
"""
        
        return [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ]