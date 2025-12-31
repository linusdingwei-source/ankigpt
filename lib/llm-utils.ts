/**
 * LLM 相关工具函数
 */

/**
 * 从 LLM 返回的 markdown 内容中提取句子读法的假名部分
 * 
 * 格式示例：
 * **句子读法：**
 * - そうですか、どうも。
 * - Sō desu ka, dōmo.
 * 
 * 应该提取出：そうですか、どうも。
 */
export function extractKanaFromLLMResult(markdown: string): string | null {
  if (!markdown) {
    return null;
  }

  // 方法1：使用正则表达式精确匹配
  const patterns = [
    /\*\*句子读法[：:]\*\*\s*\n\s*-\s*([^\n]+)/,  // **句子读法：** 格式
    /句子读法[：:]\s*\n\s*-\s*([^\n]+)/,  // 句子读法： 格式（无**）
  ];

  for (const pattern of patterns) {
    const match = markdown.match(pattern);
      if (match) {
        const kanaText = match[1].trim().replace(/^-/, '').trim();
        if (kanaText) {
          return kanaText;
        }
      }
  }

  // 方法2：如果正则没匹配到，使用逐行查找（更宽松的模式）
  const lines = markdown.split('\n');
  let inReadingSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('句子读法')) {
      inReadingSection = true;
      continue;
    }
    if (inReadingSection) {
      const stripped = line.trim();
      if (stripped.startsWith('-')) {
        const kanaText = stripped.slice(1).trim();
        if (kanaText) {
          return kanaText;
        }
      }
      // 如果遇到下一个标题（**开头），说明已经过了句子读法部分
      if (stripped.startsWith('**') && stripped.includes('**', 2)) {
        break;
      }
    }
  }

  return null;
}

/**
 * 将 Markdown 转换为 HTML（用于 Anki 卡片）
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) {
    return '';
  }

  // 简单的 Markdown 转 HTML 转换
  // 生产环境建议使用 marked 库
  let html = markdown
    // 标题
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 粗体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 列表
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // 换行
    .replace(/\n/g, '<br>');

  // 包装列表项（使用 [\s\S] 代替 . 以匹配包括换行符的所有字符）
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');

  return html;
}

