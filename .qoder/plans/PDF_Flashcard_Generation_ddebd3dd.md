# PDF Flashcard Generation Plan

## Overview

When user clicks "Generate Flashcards" on a PDF source:
1. Detect if PDF is scanned (image-based) or native (text-based) using Qwen-VL
2. For scanned PDFs: Convert each page to image, process with vision model
3. **Validate Japanese content** - Skip pages without valid Japanese (title pages, TOC, pure images)
4. Extract vocabulary and sentences from parsed content
5. Generate flashcards for each item with page number association
6. Auto-save markdown notes with page references

## Architecture

```
PDF Source
    |
    v
[PDF Type Detection API] -- /api/pdf/detect-type
    |
    +--> Native PDF: Extract text directly (pdf-lib or pdf.js)
    |
    +--> Scanned PDF: Convert to images
              |
              v
         [PDF to Image API] -- /api/pdf/page-to-image
              |
              v
         [Parse Image API] -- /api/llm/parse-image (existing)
              |
              v
         [Japanese Content Validation] -- Check for valid Japanese text
              |
              +--> No Japanese content: Skip page (save credits)
              |
              +--> Has Japanese content:
                        |
                        v
         [Refine Content API] -- /api/llm/refine-content (existing)
              |
              v
         [Generate Cards API] -- /api/cards/generate (existing)
```

## Implementation Tasks

### Phase 1: Database Schema Update

**File:** `prisma/schema.prisma`

Add `pageNumber` field to Card model:
```prisma
model Card {
  // ... existing fields
  pageNumber    Int?     // PDF page number (1-indexed)
  sourceId      String?
  source        Source?  @relation(...)
}
```

Run migration: `npx prisma migrate dev --name add_page_number`

### Phase 2: PDF Type Detection API

**File:** `/app/api/pdf/detect-type/route.ts`

- Accept PDF URL or first page image
- Use Qwen-VL to analyze if content is text-based or image-based
- Return: `{ isScanned: boolean, pageCount: number, sampleContent?: string }`

Implementation:
1. Fetch PDF, extract first page as image (using pdf-lib + canvas or pdf.js)
2. Send to Qwen-VL with prompt: "Is this a scanned document or native text PDF? Answer with JSON: {isScanned: true/false, reason: string}"
3. Return detection result

### Phase 3: PDF Page to Image Conversion

**File:** `/app/api/pdf/page-to-image/route.ts`

- Accept: `{ pdfUrl: string, pageNumber: number }`
- Return: `{ imageUrl: string }` (uploaded to storage)

Implementation options:
1. **Client-side with pdf.js** (recommended for Vercel)
   - Render PDF page to canvas in browser
   - Convert to blob, upload to storage
   - This avoids server-side PDF rendering limitations

2. **Server-side with pdf-poppler** (needs native dependencies)
   - Not recommended for Vercel serverless

**Recommended approach:** Client-side rendering
- Add `/lib/client/pdf-to-image.ts` utility
- Uses pdf.js to render pages to canvas
- Uploads result to storage via existing `/api/sources` endpoint

### Phase 4: Frontend PDF Processing Flow

**File:** `/app/[locale]/workspace/WorkspaceContent.tsx`

Update `handleGenerateCardsFromSource` to handle PDF sources:

```typescript
// In handleGenerateCardsFromSource()
if (source.type === 'pdf') {
  // 1. Detect PDF type
  const detectRes = await fetch('/api/pdf/detect-type', {
    method: 'POST',
    body: JSON.stringify({ pdfUrl: source.fileUrl })
  });
  const { isScanned, pageCount } = await detectRes.json();
  
  if (isScanned) {
    // 2. Process each page
    for (let page = 1; page <= pageCount; page++) {
      // 2a. Convert page to image (client-side)
      const imageBlob = await pdfPageToImage(source.fileUrl, page);
      const imageUrl = await uploadImage(imageBlob);
      
      // 2b. Parse image with Qwen-VL
      const parseRes = await fetch('/api/llm/parse-image', { ... });
      const { content } = await parseRes.json();
      
      // 2c. Validate Japanese content - skip if no valid Japanese
      const hasJapanese = containsJapaneseContent(content);
      if (!hasJapanese) {
        // Skip this page - likely title/TOC/image-only
        updateProgress(`第 ${page} 页无有效日语内容，跳过`);
        continue;
      }
      
      // 2d. Refine content (extract vocab & sentences)
      const refineRes = await fetch('/api/llm/refine-content', { ... });
      const { vocabulary, sentences } = await refineRes.json();
      
      // 2e. Skip if no vocabulary or sentences extracted
      if (vocabulary.length === 0 && sentences.length === 0) {
        updateProgress(`第 ${page} 页未提取到单词或句子，跳过`);
        continue;
      }
      
      // 2f. Generate cards with page number
      for (const word of vocabulary) {
        await generateCard({ text: word, pageNumber: page, ... });
      }
      for (const sentence of sentences) {
        await generateCard({ text: sentence, pageNumber: page, ... });
      }
      
      // 2g. Auto-save page content as note
      await saveNote({ content, pageNumber: page, ... });
    }
  } else {
    // Native PDF: Extract text directly
    // (Future enhancement - for now, treat as scanned)
  }
}
```

### Phase 4.5: Japanese Content Validation Utility

**File:** `/lib/japanese-utils.ts`

Add utility function to detect valid Japanese content:
```typescript
/**
 * Check if text contains meaningful Japanese content
 * Returns false for: empty, only punctuation, only numbers, 
 * only English, title-like short text
 */
export function containsJapaneseContent(text: string): boolean {
  if (!text || text.trim().length < 10) return false;
  
  // Check for Japanese characters (Hiragana, Katakana, Kanji)
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g;
  const japaneseChars = text.match(japaneseRegex) || [];
  
  // Require at least 5 Japanese characters
  if (japaneseChars.length < 5) return false;
  
  // Check ratio of Japanese to total characters
  const totalChars = text.replace(/\s/g, '').length;
  const japaneseRatio = japaneseChars.length / totalChars;
  
  // At least 20% should be Japanese characters
  return japaneseRatio >= 0.2;
}
```

This validates:
- Minimum text length (10 chars)
- Contains at least 5 Japanese characters
- At least 20% of content is Japanese

Will skip:
- Title pages (short text, mostly English/numbers)
- Table of contents (mostly numbers and short labels)
- Image-only pages (no text extracted)
- Pages with only punctuation or formatting

### Phase 5: Update Card Generation API

**File:** `/app/api/cards/generate/route.ts`

Add `pageNumber` parameter:
```typescript
const { text, cardType, deckName, sourceId, pageNumber, ... } = await request.json();

const card = await prisma.card.create({
  data: {
    // ... existing fields
    sourceId,
    pageNumber,  // NEW
  },
});
```

### Phase 6: Progress UI

**File:** `/app/[locale]/workspace/WorkspaceContent.tsx`

Add detailed progress tracking:
```typescript
const [pdfProgress, setPdfProgress] = useState({
  currentPage: 0,
  totalPages: 0,
  phase: 'detecting' | 'converting' | 'parsing' | 'extracting' | 'generating',
  cardsGenerated: 0,
});
```

Display in ChatPanel:
```
正在处理 PDF (第 3/10 页)
阶段: 解析图片内容
已生成卡片: 15
跳过页面: 2 (无有效日语内容)
```

### Phase 7: UI Display Updates

**File:** `/app/[locale]/workspace/components/StudioPanel.tsx`

Show page number in card list:
```tsx
<div className="text-xs text-gray-400">
  {card.pageNumber && `第 ${card.pageNumber} 页`}
</div>
```

## Dependencies

Already installed:
- `pdf-lib` - PDF manipulation
- `openai` - Qwen-VL API client

Need to add:
- `pdfjs-dist` - Client-side PDF rendering

```bash
npm install pdfjs-dist
```

## File Structure

```
/app/api/pdf/
  detect-type/route.ts    # PDF type detection
  
/lib/client/
  pdf-to-image.ts         # Client-side PDF page rendering
  
/app/[locale]/workspace/
  WorkspaceContent.tsx    # Updated PDF handling logic
```

## Credits Consumption Estimate

Per PDF page:
- Image parsing (Qwen-VL): 5 credits
- Content refinement: 2 credits (only if has Japanese content)
- Card generation: ~3 credits per card

**With Japanese content validation:**
- Pages without valid Japanese: Only 5 credits (parsing only)
- Pages with Japanese content: 7+ credits (parsing + refinement + cards)

For a 10-page scanned PDF (6 pages with Japanese, 4 without):
- Detection: 5 credits (1 sample page)
- Parsing all pages: 50 credits (10 x 5)
- Refinement (6 pages): 12 credits (6 x 2)
- Cards (~5 cards/page): 90 credits (30 cards x 3)
- **Total: ~157 credits** (vs 225 without validation)

## Testing Strategy

1. Test with sample scanned PDF (Japanese textbook page)
2. Test with native PDF (should detect correctly)
3. Verify page number association in generated cards
4. Check progress display during processing
5. Verify auto-saved notes include page references
6. **Test pages without Japanese content are skipped:**
   - Title pages (mostly English/numbers)
   - Table of contents
   - Image-only pages
   - Index pages