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
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// Set worker source path - use unpkg CDN for version matching
// Must match the installed pdfjs-dist version (5.4.624)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs`;

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
 * Get PDF document info (page count, etc.)
 */
export async function getPdfInfo(pdfUrl: string): Promise<PdfInfo> {
  const loadingTask = pdfjs.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  
  const metadata = await pdf.getMetadata().catch(() => null);
  const info = metadata?.info as Record<string, unknown> | undefined;
  
  return {
    pageCount: pdf.numPages,
    title: info?.Title as string | undefined,
  };
}

/**
 * Render a single PDF page to an image blob
 * 
 * @param pdfUrl - URL of the PDF file
 * @param pageNumber - 1-indexed page number
 * @param scale - Render scale (default 2.0 for good quality)
 * @returns Image blob and dimensions
 */
export async function renderPdfPageToImage(
  pdfUrl: string,
  pageNumber: number,
  scale: number = 2.0
): Promise<PageImageResult> {
  // Load PDF document
  const loadingTask = pdfjs.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  
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
  
  // Convert canvas to blob
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
      'image/png',
      1.0
    );
  });
}

/**
 * Upload an image blob to storage and return the URL
 * Uses the existing /api/sources endpoint
 */
export async function uploadImageBlob(
  blob: Blob,
  filename: string,
  headers: HeadersInit
): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('fileName', filename);
  
  const response = await fetch('/api/sources', {
    method: 'POST',
    headers: {
      // Don't set Content-Type, let browser set it for FormData
      ...(headers as Record<string, string>),
    },
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
  const loadingTask = pdfjs.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  
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
  const loadingTask = pdfjs.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  
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
