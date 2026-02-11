import { PDFDocument } from 'pdf-lib';

const MAX_CHUNK_SIZE = 45 * 1024 * 1024; // 45MB (leave margin below 50MB limit)

export interface PdfChunk {
  file: File;
  partNumber: number;
  totalParts: number;
}

/**
 * Split a large PDF file into smaller chunks by pages.
 * Each chunk will be named like "filename (Part 1 of N).pdf".
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

  // Estimate how many parts we need based on file size
  const estimatedParts = Math.ceil(file.size / maxChunkSize);
  const pagesPerPart = Math.max(1, Math.floor(totalPages / estimatedParts));

  // Build page ranges
  const ranges: { start: number; end: number }[] = [];
  for (let i = 0; i < totalPages; i += pagesPerPart) {
    ranges.push({ start: i, end: Math.min(i + pagesPerPart, totalPages) });
  }

  // Generate PDF chunks
  const baseName = file.name.replace(/\.pdf$/i, '');
  const chunks: PdfChunk[] = [];

  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i];
    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(
      pdfDoc,
      Array.from({ length: end - start }, (_, idx) => start + idx)
    );
    pages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    const partName = `${baseName} (Part ${i + 1} of ${ranges.length}).pdf`;
    // Slice to get a clean ArrayBuffer (avoids SharedArrayBuffer type issues)
    const ab = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    const partFile = new File([ab], partName, { type: 'application/pdf' });

    chunks.push({
      file: partFile,
      partNumber: i + 1,
      totalParts: ranges.length,
    });
  }

  // Post-check: if any chunk is still too large, recursively split it
  const result: PdfChunk[] = [];
  for (const chunk of chunks) {
    if (chunk.file.size > maxChunkSize && chunk.totalParts > 1) {
      const subChunks = await splitPdfFile(chunk.file, maxChunkSize);
      // Re-number the sub-chunks within the overall numbering
      result.push(...subChunks);
    } else {
      result.push(chunk);
    }
  }

  // Re-number all parts sequentially
  const totalParts = result.length;
  return result.map((chunk, idx) => ({
    ...chunk,
    partNumber: idx + 1,
    totalParts,
    file: totalParts !== chunk.totalParts
      ? new File(
          [chunk.file],
          `${baseName} (Part ${idx + 1} of ${totalParts}).pdf`,
          { type: 'application/pdf' }
        )
      : chunk.file,
  }));
}

/**
 * Check if a file is a PDF and exceeds the size limit.
 */
export function needsPdfSplit(file: File, maxSize: number = MAX_CHUNK_SIZE): boolean {
  return file.type === 'application/pdf' && file.size > maxSize;
}
