
### 代码分析

这套代码构成了一个功能完整的 Anki 插件，其核心逻辑是将用户输入的日文句子通过大语言模型（LLM）进行分析（翻译、解释单词语法等），生成发音，然后将这些内容整合成一张 Anki 卡片并添加到牌组中。

**代码结构与数据流：**

1.  **`__init__.py` (插件入口)**
    *   **作用**: Anki 插件的启动文件。
    *   **关键操作**:
        *   修改 `sys.path`，将 `lib` 目录加入，以便导入第三方库（如 `dashscope`）。
        *   设置日志系统。
        *   在 Anki 的 "工具" 菜单中添加一个名为 "anki-gpt20" 的动作。
        *   点击该菜单项时，会调用 `show_anki_gpt_dialog()` 函数。
        *   `show_anki_gpt_dialog()` 实例化并显示 `AnkiGPTWebViewDialog`。

2.  **`anki_gpt_dialog.py` (核心业务逻辑)**
    *   **作用**: 管理插件的主对话框，处理前后端交互。
    *   **关键组件**:
        *   `AnkiGPTWebViewDialog` 类：一个包含 `AnkiWebView` 的 PyQt 对话框。
        *   `AnkiWebView`: Anki 封装的 Web 浏览器组件，用于显示 HTML/JS/CSS 构成的界面。
    *   **关键操作**:
        *   **初始化 (`__init__`)**: 加载配置文件 (`config.json`)，主要是 API Key 和默认卡片类型。
        *   **UI 设置 (`setup_webview_ui`)**: 加载 `webview_ui.html` 到 `AnkiWebView` 中。
        *   **JS-Python 桥接 (`_on_js_command`)**: 接收并处理来自 JavaScript 的命令（如 `submit_action`, `prompt_api_key` 等）。
        *   **提交动作 (`submit_action`)**: 这是最核心的函数。当用户在前端点击 "提交" 时，JS 会调用它。
            *   它接收来自前端的 `text_input`, `card_type`, `include_pronunciation`。
            *   它使用 `mw.taskman.run_in_background` 启动一个后台任务 `_generate_and_upload_card`，避免 Anki 界面卡死。
        *   **后台任务 (`_generate_and_upload_card`)**:
            *   调用 `llm_anki_generator.get_anki_card_content_from_llm()` 来获取卡片背面内容和音频。
            *   调用 `upload_to_anki.upload_anki()` 将生成的卡片数据上传到 Anki。
            *   **痛点**: 在这里，`deck_name` 被硬编码为 `"japanese-llm-cards"`。这是我们需要修改的地方。
        *   **任务回调 (`_on_card_generation_complete`)**: 后台任务完成后，此函数被调用，用于在前端显示成功或失败的消息。

3.  **`webview_ui.html`, `webview_script.js`, `webview_styles.css` (前端界面)**
    *   **作用**: 构建用户交互界面。
    *   **`webview_ui.html`**: 定义了界面的所有元素，如文本框、下拉菜单、按钮等。
    *   **`webview_script.js`**: 处理用户操作（如点击按钮），收集输入数据，并通过 `pycmd()` 函数将数据发送到 Python 后端。它也负责接收来自 Python 的指令来更新界面状态（如显示加载动画、显示成功/失败消息）。
    *   **`webview_styles.css`**: 定义了界面的外观样式。

4.  **`llm_anki_generator.py` (内容生成器)**
    *   **作用**: 封装了与大模型（DashScope）和 TTS（文本转语音）服务的交互。
    *   **关键操作**:
        *   `get_anki_card_content_from_llm()`: 接收日文句子、API Key 等，构造 Prompt，调用 LLM 获取分析结果，并调用 TTS 生成音频文件。它不关心卡片最终去哪个牌组。

5.  **`upload_to_anki.py` (Anki 上传器)**
    *   **作用**: 负责与 Anki 的数据库（collection）交互，创建笔记和卡片。
    *   **关键操作**:
        *   `upload_anki()`: 接收卡片内容、类型、音频和**牌组名称 (`deck_name`)**。
        *   `ensure_deck_exists()`: 这是一个非常重要的辅助函数。它检查指定的牌组是否存在，**如果不存在，就新建一个**。这正是我们新功能所需要的核心逻辑，并且它已经实现了！我们只需要正确地把用户指定的牌组名传递给它即可。

---

### 新功能实现方案

我们的目标是让用户可以指定新卡片所属的牌组。

1.  **前端 (`webview_ui.html`)**: 增加一个文本输入框，让用户可以输入牌组名称。
2.  **前端 (`webview_script.js`)**:
    *   当用户点击 "提交" 时，获取这个牌组名称输入框的值。
    *   将这个值附加到发送给 Python 的参数列表中。
    *   当界面初始化时，从配置中读取并设置一个默认的牌组名称。
3.  **后端 (`anki_gpt_dialog.py`)**:
    *   修改 `submit_action` 函数，使其能接收新的 `deck_name` 参数。
    *   将这个 `deck_name` 传递给后台任务 `_generate_and_upload_card`。
    *   在 `_generate_and_upload_card` 中，将收到的 `deck_name` 传递给 `upload_anki` 函数，替换掉原来的硬编码值。
    *   （可选但推荐）在配置文件 `config.json` 中增加一个 `default_deck_name` 字段，用于初始化界面的牌组输入框。

下面是修改后的代码：

---

### 修改后的代码

#### 1. `config.json` (示例配置)
增加一个默认牌组名称。

```json
{
    "dashscope_api_key": "",
    "default_card_type": "问答题（附翻转卡片）",
    "default_deck_name": "japanese-llm-cards"
}
```

#### 2. `anki-gpt20/anki_gpt_dialog.py`
这是主要的修改文件，负责串联前后端逻辑。

```python
# anki-gpt20/anki_gpt_dialog.py
import os
import logging
import json
from PyQt6.QtCore import QUrl
from PyQt6.QtWidgets import QVBoxLayout, QDialog, QInputDialog
from aqt import mw
from aqt.webview import AnkiWebView
from aqt.utils import showInfo, tooltip
from aqt.taskman import TaskManager # 导入 TaskManager
from .consts import ADDON_NAME # 确保导入 ADDON_NAME
# 导入 llm_anki_generator 和 upload_to_anki 中的函数
from .llm_anki_generator import get_anki_card_content_from_llm
from .upload_to_anki import upload_anki

logger = logging.getLogger(ADDON_NAME)

# 获取附加组件的目录
addon_dir = os.path.dirname(__file__)

class AnkiGPTWebViewDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Anki-GPT")
        self.setMinimumSize(800, 600) # 设置一个合适的初始大小
        # 加载配置
        self.config = mw.addonManager.getConfig(ADDON_NAME)
        # --- 新增/修改 START ---
        # 为新配置项提供默认值
        default_config = {
            'dashscope_api_key': '',
            'default_card_type': '问答题（附翻转卡片）',
            'default_deck_name': 'japanese-llm-cards'
        }
        if not self.config:
            self.config = default_config
        else:
            # 确保现有配置包含新字段
            for key, value in default_config.items():
                if key not in self.config:
                    self.config[key] = value
        # --- 新增/修改 END ---
        mw.addonManager.writeConfig(ADDON_NAME, self.config)

        logger.debug(f"[{ADDON_NAME}.anki_gpt_dialog.__init__] Loaded config: {self.config}")
        self.setup_webview_ui()
        logger.info(f"[{ADDON_NAME}.anki_gpt_dialog] AnkiGPTWebViewDialog 界面初始化完成。")
        if not self.config.get('dashscope_api_key'):
            logger.warning(f"[{ADDON_NAME}.anki_gpt_dialog.__init__] DashScope API Key is not set.")

    def setup_webview_ui(self):
        """设置 Webview 界面"""
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        self.webview = AnkiWebView(self)
        main_layout.addWidget(self.webview)

        html_url_str = None
        try:
            port = mw.mediaServer.getPort()
            html_url_str = f"http://127.0.0.1:{port}/_addons/{ADDON_NAME}/webview_ui.html"
            logger.debug(f"[{ADDON_NAME}.anki_gpt_dialog.setup_webview_ui] Manually constructed URL using mw.mediaServer: {html_url_str}")
        except Exception as e:
            logger.error(f"[{ADDON_NAME}.anki_gpt_dialog.setup_webview_ui] Error getting media server port or constructing URL: {e}. Falling back to file://.")
            logger.warning(f"[{ADDON_NAME}.anki_gpt_dialog.setup_webview_ui] Debugging mw object:")
            logger.warning(f"[{ADDON_NAME}.anki_gpt_dialog.setup_webview_ui] Type of mw: {type(mw)}")
            logger.warning(f"[{ADDON_NAME}.anki_gpt_dialog.setup_webview_ui] Attributes of mw: {dir(mw)}")

        if html_url_str:
            self.webview.set_open_links_externally(False) # 禁用在外部浏览器中打开链接
            self.webview.load_url(QUrl(html_url_str))
        else:
            # 回退到 file:// 协议加载，如果媒体服务器方法失败或不可用
            html_file_path = os.path.join(addon_dir, "webview_ui.html")
            self.webview.load_url(QUrl.fromLocalFile(html_file_path))
            logger.warning(f"[{ADDON_NAME}.anki_gpt_dialog.setup_webview_ui] Loaded HTML via file:// protocol: {html_file_path}")

        # 设置 Python-JavaScript 桥接
        self.webview.set_bridge_command(self._on_js_command, context=self)

    def _on_js_command(self, command: str) -> None:
        """处理来自 JavaScript 的命令"""
        logger.debug(f"[{ADDON_NAME}.anki_gpt_dialog] Received JS command: {command}")
        parts = command.split("::", 1)
        cmd = parts[0]
        args_str = parts[1] if len(parts) > 1 else "[]"
        args = json.loads(args_str)

        if cmd == "prompt_api_key":
            self._prompt_for_api_key_from_js()
        elif cmd == "clear_api_key":
            self._clear_api_key_from_js()
        elif cmd == "submit_action":
            self.submit_action(*args)
        elif cmd == "domDone": # <--- 这个分支是 Anki 内部的 bridge script 调用的
            logger.debug(f"[{ADDON_NAME}.anki_gpt_dialog._on_js_command] Received domDone from Anki's bridge script. Sending initial config.")
            self.webview.eval(f"setInitialConfig({json.dumps(self.config)});")
            self.webview.eval("setLoading(false);") # 确保初始状态是未加载
            self.webview.eval(f"setApiKeyStatus({bool(self.config.get('dashscope_api_key'))});") # 初始设置 API Key 状态
        else:
            logger.warning(f"[{ADDON_NAME}.anki_gpt_dialog] Unhandled JS command: {command}")

    def _prompt_for_api_key_from_js(self):
        logger.debug(f"[{ADDON_NAME}.anki_gpt_dialog._prompt_for_api_key_from_js] Prompting for API key.")
        api_key, ok = QInputDialog.getText(
            self,
            "设置 DashScope API Key",
            "请输入您的 DashScope API Key:",
            echo=QInputDialog.EchoMode.Normal,
            text=self.config.get('dashscope_api_key', '')
        )
        if ok and api_key:
            self.config['dashscope_api_key'] = api_key
            mw.addonManager.writeConfig(ADDON_NAME, self.config)
            logger.info(f"[{ADDON_NAME}.anki_gpt_dialog._prompt_for_api_key_from_js] DashScope API Key updated and saved.")
            self.webview.eval(f"setApiKeyStatus(true);") # 通知 JS 状态更新
        else:
            logger.info(f"[{ADDON_NAME}.anki_gpt_dialog._prompt_for_api_key_from_js] API Key setting cancelled or empty.")
            self.webview.eval(f"setApiKeyStatus({bool(self.config.get('dashscope_api_key'))});") # 通知 JS 状态更新

    def _clear_api_key_from_js(self):
        logger.debug(f"[{ADDON_NAME}.anki_gpt_dialog._clear_api_key_from_js] Clearing API key.")
        self.config['dashscope_api_key'] = ''
        mw.addonManager.writeConfig(ADDON_NAME, self.config)
        logger.info(f"[{ADDON_NAME}.anki_gpt_dialog._clear_api_key_from_js] DashScope API Key cleared.")
        self.webview.eval(f"setApiKeyStatus(false);") # 通知 JS 状态更新

    # --- 新增/修改 START ---
    # 修改函数签名以接收 deck_name
    def submit_action(self, text_input: str, card_type: str, include_pronunciation: bool, deck_name: str):
        logger.info(f"[{ADDON_NAME}.anki_gpt_dialog.submit_action] Final API Key for LLM: '{self.config.get('dashscope_api_key', '')[:5]}...'")
        api_key = self.config.get('dashscope_api_key')
        if not api_key:
            self.webview.eval("displayTemporaryMessage('请先设置 DashScope API Key！', 'red', 5000);")
            self.webview.eval("setLoading(false);")
            return

        # 如果用户未输入牌组名，则使用配置中的默认值
        final_deck_name = deck_name.strip() if deck_name.strip() else self.config.get('default_deck_name', 'japanese-llm-cards')
        logger.info(f"[{ADDON_NAME}.anki_gpt_dialog.submit_action] Target deck name: '{final_deck_name}'")

        self.webview.eval("setLoading(true);") # <--- 开始加载动画
        # 启动后台任务，并传递 final_deck_name
        mw.taskman.run_in_background(
            lambda: self._generate_and_upload_card(text_input, card_type, include_pronunciation, api_key, final_deck_name),
            self._on_card_generation_complete
        )
        tooltip("正在生成卡片，请稍候...", period=2000) # 提示用户
    # --- 新增/修改 END ---

    # --- 新增/修改 START ---
    # 修改函数签名以接收 deck_name
    def _generate_and_upload_card(self, text_input: str, card_type: str, include_pronunciation: bool, api_key: str, deck_name: str):
        """
        后台任务：调用 LLM 生成内容和音频，然后上传到 Anki。
        """
        logger.debug(f"[{ADDON_NAME}.anki_gpt_dialog._generate_and_upload_card] Background task: Starting card generation and upload.")
        logger.debug(f"[{ADDON_NAME}.anki_gpt_dialog._generate_and_upload_card] API Key passed to LLM generator: '{api_key[:5]}...'")
        
        media_dir = mw.col.media.dir()
        logger.debug(f"[{ADDON_NAME}.anki_gpt_dialog._generate_and_upload_card] Anki media directory: {media_dir}")

        anki_back_content, audio_file_path = get_anki_card_content_from_llm(
            japanese_sentence=text_input,
            output_audio_dir=media_dir,
            api_key=api_key
        )
        if not anki_back_content:
            logger.error(f"[{ADDON_NAME}.anki_gpt_dialog._generate_and_upload_card] LLM failed to generate back content for '{text_input}'.")
            return False, None

        # 使用从前端传来的 deck_name
        note_ids = upload_anki(
            word_or_sentence=text_input,
            back_content=anki_back_content,
            card_type=card_type,
            audio_file_path=audio_file_path if include_pronunciation else None,
            deck_name=deck_name # 使用传递进来的 deck_name
        )
        # --- 新增/修改 END ---
        
        if note_ids:
            logger.info(f"[{ADDON_NAME}.anki_gpt_dialog._generate_and_upload_card] Card created successfully. Note ID(s): {note_ids}")
            return True, note_ids
        else:
            logger.error(f"[{ADDON_NAME}.anki_gpt_dialog._generate_and_upload_card] Failed to upload card to Anki for '{text_input}'.")
            return False, None

    def _on_card_generation_complete(self, future):
        """后台任务完成后的回调"""
        self.webview.eval("setLoading(false);")  # 通知 JS 停止加载动画
        try:
            success, note_ids = future.result()
            if success:
                self.webview.eval(f"displayTemporaryMessage('成功创建 {len(note_ids)} 张卡片！', 'green', 3000);")
                logger.info(
                    f"[{ADDON_NAME}.anki_gpt_dialog._on_card_generation_complete] Submission action completed.")
                self.webview.eval("clearInput();")
            else:
                self.webview.eval("displayTemporaryMessage('卡片生成失败。', 'red', 5000);")
                logger.error(f"[{ADDON_NAME}.anki_gpt_dialog._on_card_generation_complete] Card generation failed.")
        except Exception as e:
            self.webview.eval(f"displayTemporaryMessage('卡片生成过程中发生错误: {str(e)}', 'red', 5000);")
            logger.exception(
                f"[{ADDON_NAME}.anki_gpt_dialog._on_card_generation_complete] Error during card generation: {e}")
```

#### 3. `anki-gpt20/webview_ui.html`
在界面上增加一个用于输入牌组名称的文本框。

```html
<!-- anki-gpt-addon/webview_ui.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anki-GPT (日文大模型)</title>
    <link rel="stylesheet" href="webview_styles.css">
    <style>
        /* [其他样式保持不变] */
        #loadingIndicator {
            position: fixed; /* 固定定位，覆盖整个页面 */
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7); /* 半透明黑色背景 */
            color: white; /* 文字颜色 */
            display: flex; /* 使用 flexbox 居中内容 */
            justify-content: center;
            align-items: center;
            font-size: 2em; /* 字体大小 */
            z-index: 1000; /* 确保在最上层 */
            display: none; /* 默认隐藏，通过 JavaScript 控制显示 */
        }
        .status-bar {
            margin-top: 15px;
            margin-bottom: 15px;
            text-align: center;
            min-height: 1.5em;
            display: block;
        }
        .status-message {
            font-weight: bold;
            padding: 8px 15px;
            border-radius: 5px;
            display: inline-block;
        }
        .status-red { color: white; background-color: #dc3545; }
        .status-green { color: white; background-color: #28a745; }
        .status-orange { color: white; background-color: #ffc107; }
        .status-transparent { color: transparent; background-color: transparent; }
        /* --- 新增/修改 START --- */
        /* 为文本输入框复用样式 */
        .styled-input {
            background-color: var(--bg-control);
            color: var(--fg-text);
            border: 1px solid var(--border-color);
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 1.2em;
            width: 300px;
            box-sizing: border-box;
        }
        .styled-input:focus {
            outline: none;
            border-color: var(--accent-color);
            box-shadow: 0 0 0 2px rgba(0, 170, 255, 0.5);
        }
        /* --- 新增/修改 END --- */
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Anki-GPT (日文大模型)</h1>
        </div>

        <div class="section card-type-section">
            <label for="cardType" class="hint-label">选择要创建的Anki卡片类型：</label>
            <select id="cardType" class="styled-select">
                <option value="Basic-b860c">Basic-b860c</option>
                <option value="问答题（附翻转卡片）" selected>问答题（附翻转卡片）</option>
            </select>
        </div>

        <!-- --- 新增/修改 START --- -->
        <div class="section deck-name-section">
            <label for="deckName" class="hint-label">指定牌组名称（不存在则新建）：</label>
            <input type="text" id="deckName" class="styled-input" placeholder="输入牌组名称...">
        </div>
        <!-- --- 新增/修改 END --- -->

        <div class="section input-section">
            <label for="inputText" class="hint-label">在此输入日文句子或单词（支持多行，Ctrl/Cmd+Enter 提交）：</label>
            <textarea id="inputText" class="styled-textarea" placeholder="在此输入日文..."></textarea>
        </div>

        <div class="section checkbox-section">
            <input type="checkbox" id="includePronunciation" class="styled-checkbox" checked>
            <label for="includePronunciation" class="checkbox-label">包含发音</label>
        </div>

        <div class="section submit-section">
            <button id="submitButton" class="styled-button primary">提交</button>
        </div>
        
        <div class="status-bar">
            <span id="statusLabel" class="status-message"></span>
        </div>

        <div class="section settings-section">
            <button id="setApiKeyButton" class="styled-button secondary">设置 API Key</button>
            <button id="deleteApiKeyButton" class="styled-button secondary">删除 API Key</button>
        </div>
    </div>
    
    <div id="loadingIndicator">
        正在生成卡片...
    </div>

    <script src="webview_script.js"></script>
</body>
</html>
```

#### 4. `anki-gpt20/webview_script.js`
修改 JS 以处理新的输入框。

```javascript
// Python 桥接函数，由 Anki Webview 提供
// pycmd(command_string)

// --- Helper functions to get UI element values ---
function getInputValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}

function getCheckboxValue(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
}

// --- Functions callable from Python (exposed globally) ---
/**
 * 控制加载指示器的显示/隐藏，并禁用/启用相关按钮。
 * @param {boolean} isLoading - true 表示显示加载，false 表示隐藏加载。
 */
window.setLoading = function(isLoading) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const submitButton = document.getElementById('submitButton');
    const setApiKeyButton = document.getElementById('setApiKeyButton');
    const deleteApiKeyButton = document.getElementById('deleteApiKeyButton');
    const inputTextarea = document.getElementById('inputText');
    const cardTypeSelect = document.getElementById('cardType');
    const includePronunciationCheckbox = document.getElementById('includePronunciation');
    // --- 新增/修改 START ---
    const deckNameInput = document.getElementById('deckName'); // 获取牌组输入框
    // --- 新增/修改 END ---

    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }

    // 禁用/启用按钮和输入框
    if (submitButton) submitButton.disabled = isLoading;
    if (setApiKeyButton) setApiKeyButton.disabled = isLoading;
    if (deleteApiKeyButton) deleteApiKeyButton.disabled = isLoading;
    if (inputTextarea) inputTextarea.disabled = isLoading;
    if (cardTypeSelect) cardTypeSelect.disabled = isLoading;
    if (includePronunciationCheckbox) includePronunciationCheckbox.disabled = isLoading;
    // --- 新增/修改 START ---
    if (deckNameInput) deckNameInput.disabled = isLoading; // 禁用牌组输入框
    // --- 新增/修改 END ---

    if (isLoading) {
        window.updateStatus("正在生成卡片...", "orange");
    }
};

// [ ... updateStatus, setSubmitButtonEnabled, clearInput 函数保持不变 ... ]
window.updateStatus = function(message, color) { /* ... */ };
window.setSubmitButtonEnabled = function(enabled) { /* ... */ };
window.clearInput = function() { /* ... */ };

/**
 * 由 Python 调用，用于在页面加载后初始化 UI 状态。
 * @param {object} config - 从 Python 传递过来的配置对象。
 */
window.setInitialConfig = function(config) {
    console.log("Received initial config from Python:", config);
    
    // 设置默认卡片类型
    const cardTypeSelect = document.getElementById('cardType');
    if (cardTypeSelect && config.default_card_type) {
        cardTypeSelect.value = config.default_card_type;
    }

    // --- 新增/修改 START ---
    // 设置默认牌组名称
    const deckNameInput = document.getElementById('deckName');
    if (deckNameInput && config.default_deck_name) {
        deckNameInput.value = config.default_deck_name;
    }
    // --- 新增/修改 END ---

    // 更新 API Key 按钮状态
    window.setApiKeyStatus(!!config.dashscope_api_key);
};

// [ ... setApiKeyStatus, displayTemporaryMessage 函数保持不变 ... ]
window.setApiKeyStatus = function(hasKey) { /* ... */ };
window.displayTemporaryMessage = function(message, color, duration) { /* ... */ };

// --- Event Listeners for UI interactions ---
// Submit button click
document.getElementById('submitButton').addEventListener('click', () => {
    const inputText = getInputValue('inputText');
    if (!inputText.trim()) {
        window.displayTemporaryMessage("请输入日文句子或单词！", "red", 3000);
        return;
    }

    const cardType = getInputValue('cardType');
    const includePronunciation = getCheckboxValue('includePronunciation');
    // --- 新增/修改 START ---
    const deckName = getInputValue('deckName'); // 获取牌组名称
    // 将 deckName 添加到参数数组
    const args = [inputText, cardType, includePronunciation, deckName];
    // --- 新增/修改 END ---

    pycmd(`submit_action::${JSON.stringify(args)}`);
    window.setLoading(true);
});

// [ ... 其他事件监听器保持不变 ... ]
document.getElementById('inputText').addEventListener('keydown', (event) => { /* ... */ });
document.getElementById('setApiKeyButton').addEventListener('click', () => { /* ... */ });
document.getElementById('deleteApiKeyButton').addEventListener('click', () => { /* ... */ });
document.addEventListener('DOMContentLoaded', () => { /* ... */ });
```

### 总结

通过以上修改，我们成功地为插件添加了指定牌组的功能：
1.  **UI层面**: 在 `webview_ui.html` 中增加了一个输入框，并在 `webview_styles.css` 中为其添加了样式。
2.  **前端逻辑**: `webview_script.js` 现在会读取这个输入框的值，并将其作为第四个参数发送给 Python。它也会在加载配置时，设置默认的牌组名称，并在生成卡片时禁用该输入框。
3.  **后端逻辑**: `anki_gpt_dialog.py` 的 `submit_action` 函数现在能接收这个牌组名称，并将其传递给后台任务。后台任务最终调用 `upload_anki` 时，使用的是用户指定的牌组名称，而不是硬编码的值。
4.  **核心功能复用**: 我们充分利用了 `upload_to_anki.py` 中已有的 `ensure_deck_exists` 函数，它能自动创建不存在的牌组，这使得后端逻辑的修改非常简单。

现在，当用户在插件界面输入牌组名称并提交后，卡片就会被创建到指定的牌组中。如果该牌组不存在，Anki 会自动创建它。如果用户不输入任何内容，则会使用配置文件中的默认牌组名。


## 文件拆分结果

### 新的目录结构

```
anki-gpt20/
├── dialog/                    # 新建的对话框模块目录
│   ├── __init__.py           # 模块导出
│   ├── dialog.py             # 主对话框类（174行）
│   ├── utils.py              # 辅助函数（18行）
│   ├── config.py             # 配置管理（95行）
│   ├── session_history.py    # 会话历史管理（58行）
│   ├── generator_handler.py  # 生成器功能（95行）
│   ├── asr_handler.py        # ASR功能（约400行）
│   ├── card_manager.py       # 卡片管理（添加到Anki）（67行）
│   └── deck_browser.py       # 牌组浏览功能（约230行）
├── anki_gpt_dialog.py.bak    # 原文件备份
└── __init__.py               # 已更新导入路径
```

### 拆分说明

1. **`dialog/utils.py`** (18行)
   - `get_note_type_names()` - 获取卡片模板名称
   - `get_deck_names()` - 获取牌组名称

2. **`dialog/config.py`** (95行)
   - `ConfigManager` 类
   - `ensure_default_config()` - 确保默认配置
   - `_validate_config()` - 验证配置有效性
   - `save_config()` - 保存配置

3. **`dialog/session_history.py`** (58行)
   - `SessionHistoryManager` 类
   - `get_session_history()` - 获取会话历史
   - `save_session_history()` - 保存会话历史
   - `delete_session_history()` - 删除会话历史

4. **`dialog/generator_handler.py`** (95行)
   - `GeneratorHandler` 类
   - `generate_preview()` - 生成预览
   - `_background_generate()` - 后台生成
   - `_on_preview_generation_complete()` - 生成完成回调

5. **`dialog/asr_handler.py`** (约400行)
   - `ASRHandler` 类
   - `asr_transcribe()` - ASR转写
   - `_background_asr_transcribe()` - 后台转写
   - `_align_timestamps_to_optimized_text()` - 时间戳对齐
   - `_on_asr_transcribe_complete()` - 转写完成回调

6. **`dialog/card_manager.py`** (67行)
   - `CardManager` 类
   - `add_to_anki()` - 添加到Anki

7. **`dialog/deck_browser.py`** (约230行)
   - `DeckBrowserHandler` 类
   - `fetch_deck_cards()` - 获取牌组卡片
   - `fetch_card_details()` - 获取卡片详情
   - `delete_deck_card()` - 删除卡片
   - `edit_deck_card()` - 编辑卡片

8. **`dialog/dialog.py`** (174行)
   - `AnkiGPTWebViewDialog` 主类
   - 初始化各个功能模块
   - 命令路由处理
   - WebView UI 设置

### 优势

1. 模块化：每个功能模块独立，便于维护
2. 可读性：文件更小，职责清晰
3. 可扩展性：新增功能只需添加新模块
4. 可测试性：各模块可独立测试
5. 代码组织：按功能分类，结构清晰

### 文件大小对比

- 原文件：`anki_gpt_dialog.py` - 997行
- 拆分后：
  - `dialog.py` - 174行（主类）
  - `asr_handler.py` - 约400行（最复杂的模块）
  - 其他模块：18-230行

所有文件已创建并通过语法检查。原文件已备份为 `anki_gpt_dialog.py.bak`。可以测试新结构是否正常工作。
