/**
 * PDF to Image Conversion Utility (Client-side)
 * 
 * Uses pdf.js to render PDF pages to canvas and convert to image blobs.
 * This is preferred over server-side rendering because:
 * 1. Vercel serverless has limitations with native PDF libraries
 * 2. Client-side rendering is faster for user
 * 3. No server memory overhead for large PDFs
 */

import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// Set worker source path - use unpkg CDN for version matching
// Must match the installed pdfjs-dist version (5.4.624)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs`;

// Cache for loaded PDF documents to avoid re-fetching
const pdfCache = new Map<string, PDFDocumentProxy>();

export interface PdfInfo {
  pageCount: number;
  title?: string;
}

export interface PageImageResult {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Convert a Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Load PDF document with retry logic
 * Caches the document for subsequent page renders
 * 
 * @param pdfUrl - URL of the PDF file
 * @param retries - Number of retry attempts (default 3)
 */
export async function loadPdfDocument(pdfUrl: string, retries = 3): Promise<PDFDocumentProxy> {
  // Check cache first
  const cached = pdfCache.get(pdfUrl);
  if (cached) {
    return cached;
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        // Wait before retry with exponential backoff (2s, 4s, 8s for slow networks)
        const waitTime = 2000 * Math.pow(2, attempt);
        console.log(`PDF load retry attempt ${attempt + 1}/${retries}, waiting ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const loadingTask = pdfjs.getDocument({
        url: pdfUrl,
        // Disable range requests to avoid connection issues with some servers
        disableRange: true,
        // Disable streaming to ensure complete download
        disableStream: true,
        // Disable auto-fetch for better control over loading
        disableAutoFetch: true,
      });
      
      // Add progress tracking for long loads
      loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`PDF loading: ${percent}% (${Math.round(progress.loaded/1024)}KB / ${Math.round(progress.total/1024)}KB)`);
        }
      };
      
      const pdf = await loadingTask.promise;
      
      // Cache the loaded document
      pdfCache.set(pdfUrl, pdf);
      
      return pdf;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`PDF load attempt ${attempt + 1} failed:`, lastError.message);
    }
  }
  
  throw new Error(`PDF 加载失败（已重试 ${retries} 次）: ${lastError?.message || '网络错误'}\n如果网络较慢，请稍后再试。`);
}

/**
 * Clear PDF cache for a specific URL or all URLs
 */
export function clearPdfCache(pdfUrl?: string): void {
  if (pdfUrl) {
    const pdf = pdfCache.get(pdfUrl);
    if (pdf) {
      pdf.destroy();
      pdfCache.delete(pdfUrl);
    }
  } else {
    pdfCache.forEach(pdf => pdf.destroy());
    pdfCache.clear();
  }
}

/**
 * Get PDF document info (page count, etc.)
 */
export async function getPdfInfo(pdfUrl: string): Promise<PdfInfo> {
  const pdf = await loadPdfDocument(pdfUrl);
  
  const metadata = await pdf.getMetadata().catch(() => null);
  const info = metadata?.info as Record<string, unknown> | undefined;
  
  return {
    pageCount: pdf.numPages,
    title: info?.Title as string | undefined,
  };
}

/**
 * Render a single PDF page to an image blob
 * Uses cached PDF document for efficiency
 * 
 * @param pdfUrl - URL of the PDF file
 * @param pageNumber - 1-indexed page number
 * @param scale - Render scale (default 1.5 for balance of quality and size)
 * @returns Image blob and dimensions
 */
export async function renderPdfPageToImage(
  pdfUrl: string,
  pageNumber: number,
  scale: number = 1.5
): Promise<PageImageResult> {
  // Load PDF document (uses cache)
  const pdf = await loadPdfDocument(pdfUrl);
  
  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error(`Invalid page number: ${pageNumber}. PDF has ${pdf.numPages} pages.`);
  }
  
  // Get the page
  const page = await pdf.getPage(pageNumber);
  
  // Calculate viewport
  const viewport = page.getViewport({ scale });
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Failed to get canvas 2D context');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Render page to canvas
  await page.render({
    canvasContext: context,
    viewport,
    canvas,
  }).promise;
  
  // Convert canvas to blob - use JPEG for smaller file size
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({
            blob,
            width: viewport.width,
            height: viewport.height,
          });
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/jpeg',  // JPEG is much smaller than PNG
      0.85  // 85% quality - good balance of size and quality
    );
  });
}

/**
 * Upload an image blob to storage and return the URL
 * Uses the existing /api/sources endpoint
 * 
 * @param blob - Image blob to upload
 * @param filename - Filename for the uploaded image
 * @param headers - Request headers (for auth)
 * @param options - Optional parentSourceId and pageNumber for PDF association
 */
export async function uploadImageBlob(
  blob: Blob,
  filename: string,
  headers: HeadersInit,
  options?: { parentSourceId?: string; pageNumber?: number }
): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('fileName', filename);
  
  // Add parent source association if provided
  if (options?.parentSourceId) {
    formData.append('parentSourceId', options.parentSourceId);
  }
  if (options?.pageNumber !== undefined) {
    formData.append('pageNumber', options.pageNumber.toString());
  }
  
  // Filter out Content-Type from headers - let browser set it for FormData
  const filteredHeaders: Record<string, string> = {};
  const headersRecord = headers as Record<string, string>;
  for (const key of Object.keys(headersRecord)) {
    if (key.toLowerCase() !== 'content-type') {
      filteredHeaders[key] = headersRecord[key];
    }
  }
  
  const response = await fetch('/api/sources', {
    method: 'POST',
    headers: filteredHeaders,
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Upload failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success || !data.data?.source) {
    throw new Error('Invalid response from upload API');
  }
  
  // Return the URL of the uploaded image
  return data.data.source.fileUrl || data.data.source.contentUrl;
}

/**
 * Check if a PDF is likely scanned (image-based) by analyzing first page
 * This is a heuristic check - actual detection is done server-side with vision model
 * 
 * @param pdfUrl - URL of the PDF
 * @returns true if PDF appears to be scanned/image-based
 */
export async function isPdfLikelyScanned(pdfUrl: string): Promise<boolean> {
  const pdf = await loadPdfDocument(pdfUrl);
  
  // Get first page
  const page = await pdf.getPage(1);
  
  // Try to extract text content
  const textContent = await page.getTextContent();
  
  // If very little text extracted, likely scanned
  const textLength = textContent.items
    .filter((item): item is TextItem => 'str' in item)
    .map((item) => item.str || '')
    .join('')
    .trim()
    .length;
  
  // Threshold: if less than 50 chars on first page, likely scanned
  return textLength < 50;
}

/**
 * Extract text content from a PDF page
 * Used for native PDFs that have selectable text
 */
export async function extractTextFromPdfPage(
  pdfUrl: string,
  pageNumber: number
): Promise<string> {
  const pdf = await loadPdfDocument(pdfUrl);
  
  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error(`Invalid page number: ${pageNumber}. PDF has ${pdf.numPages} pages.`);
  }
  
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();
  
  // Combine text items with proper spacing
  let lastY = -1;
  let text = '';
  
  for (const item of textContent.items) {
    const typedItem = item as { str?: string; transform?: number[] };
    if (!typedItem.str) continue;
    
    // Check if this is a new line (different Y position)
    const y = typedItem.transform?.[5] || 0;
    if (lastY !== -1 && Math.abs(y - lastY) > 5) {
      text += '\n';
    } else if (text.length > 0 && !text.endsWith(' ') && !text.endsWith('\n')) {
      text += ' ';
    }
    
    text += typedItem.str;
    lastY = y;
  }
  
  return text.trim();
}
