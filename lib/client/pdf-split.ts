import { PDFDocument } from 'pdf-lib';

// The serverActions.bodySizeLimit in next.config.mjs only applies to Server Actions,
// NOT to API Route Handlers. The default limit for Route Handlers is ~1-4MB.
// Use 3.5MB per chunk to stay safely under common platform limits (Vercel Hobby: 4.5MB).
const MAX_CHUNK_SIZE = 3.5 * 1024 * 1024; // 3.5MB per chunk

export interface PdfChunk {
  file: File;
  partNumber: number;
  totalParts: number;
}

/**
 * Convert pdf-lib Uint8Array to a File object.
 * Uses .slice() to produce a proper ArrayBuffer (avoids SharedArrayBuffer TS issues).
 */
function pdfBytesToFile(pdfBytes: Uint8Array, name: string): File {
  const ab = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
  return new File([ab], name, { type: 'application/pdf' });
}

/**
 * Build a single-page PDF from the source document and return its byte size.
 * Used to measure per-page sizes for smart splitting.
 */
async function measurePageSize(
  srcDoc: PDFDocument,
  pageIndex: number
): Promise<number> {
  const tmp = await PDFDocument.create();
  const [page] = await tmp.copyPages(srcDoc, [pageIndex]);
  tmp.addPage(page);
  const bytes = await tmp.save();
  return bytes.byteLength;
}

/**
 * Split a large PDF file into smaller chunks by pages.
 * Each chunk will be named like "filename (Part 1 of N).pdf".
 *
 * Uses per-page size measurement to build chunks that stay under the limit,
 * handling PDFs with uneven page sizes (image-heavy pages, scanned docs, etc.).
 *
 * If the file is already under the size limit, returns a single-element array
 * with the original file.
 */
export async function splitPdfFile(
  file: File,
  maxChunkSize: number = MAX_CHUNK_SIZE
): Promise<PdfChunk[]> {
  // If file is small enough, no splitting needed
  if (file.size <= maxChunkSize) {
    return [{ file, partNumber: 1, totalParts: 1 }];
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  if (totalPages <= 1) {
    // Single-page PDF that's too large — can't split further
    return [{ file, partNumber: 1, totalParts: 1 }];
  }

  // Measure each page's approximate size so we can bin-pack intelligently.
  // PDF overhead per document is ~1-2KB, so we reserve a small buffer.
  const PDF_OVERHEAD = 50 * 1024; // 50KB reserved for PDF structure overhead
  const effectiveLimit = maxChunkSize - PDF_OVERHEAD;

  console.log(`[PDF Split] File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Pages: ${totalPages}`);
  console.log(`[PDF Split] Chunk limit: ${(effectiveLimit / 1024 / 1024).toFixed(2)}MB`);

  const pageSizes: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    const size = await measurePageSize(pdfDoc, i);
    pageSizes.push(size);
    if (size > effectiveLimit) {
      console.warn(`[PDF Split] Page ${i + 1} is ${(size / 1024 / 1024).toFixed(2)}MB - exceeds chunk limit!`);
    }
  }

  console.log(`[PDF Split] Page sizes (MB): ${pageSizes.map(s => (s / 1024 / 1024).toFixed(2)).join(', ')}`);

  // Greedy bin-packing: accumulate pages until adding one more would exceed the limit
  const ranges: { start: number; end: number }[] = [];
  let rangeStart = 0;
  let accumulated = 0;

  for (let i = 0; i < totalPages; i++) {
    const pageSize = pageSizes[i];

    if (accumulated + pageSize > effectiveLimit && i > rangeStart) {
      // Current page would exceed limit — close this range
      ranges.push({ start: rangeStart, end: i });
      rangeStart = i;
      accumulated = pageSize;
    } else {
      accumulated += pageSize;
    }
  }
  // Don't forget the last range
  if (rangeStart < totalPages) {
    ranges.push({ start: rangeStart, end: totalPages });
  }

  console.log(`[PDF Split] Created ${ranges.length} chunks`);
  ranges.forEach((r, i) => {
    const chunkSize = pageSizes.slice(r.start, r.end).reduce((a, b) => a + b, 0);
    console.log(`[PDF Split] Chunk ${i + 1}: pages ${r.start + 1}-${r.end}, est. ${(chunkSize / 1024 / 1024).toFixed(2)}MB`);
  });

  // Strip the .pdf extension and any existing "(Part X of Y)" suffix for clean naming
  const baseName = file.name
    .replace(/\.pdf$/i, '')
    .replace(/\s*\(Part \d+ of \d+\)$/, '');

  // Generate PDF chunks
  const chunks: PdfChunk[] = [];
  const totalParts = ranges.length;

  for (let i = 0; i < totalParts; i++) {
    const { start, end } = ranges[i];
    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(
      pdfDoc,
      Array.from({ length: end - start }, (_, idx) => start + idx)
    );
    pages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    const partName = totalParts === 1
      ? `${baseName}.pdf`
      : `${baseName} (Part ${i + 1} of ${totalParts}).pdf`;

    chunks.push({
      file: pdfBytesToFile(pdfBytes, partName),
      partNumber: i + 1,
      totalParts,
    });
  }

  return chunks;
}

/**
 * Check if a file is a PDF and exceeds the size limit.
 */
export function needsPdfSplit(file: File, maxSize: number = MAX_CHUNK_SIZE): boolean {
  return file.type === 'application/pdf' && file.size > maxSize;
}
