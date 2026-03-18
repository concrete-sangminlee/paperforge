'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  DownloadIcon,
  FileTextIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editor-store';

type PDFDocumentProxy = {
  numPages: number;
  getPage: (n: number) => Promise<PDFPageProxy>;
  destroy: () => void;
};

type PDFPageProxy = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
};

export function PdfViewer() {
  const latestPdfUrl = useEditorStore((s) => s.latestPdfUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<Promise<void> | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderPage = useCallback(async (doc: PDFDocumentProxy, pageNum: number, pageScale: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Wait for any in-flight render
    if (renderTaskRef.current) {
      await renderTaskRef.current.catch(() => null);
    }

    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: pageScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const task = page.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = task.promise;
    await task.promise;
    renderTaskRef.current = null;
  }, []);

  // Load PDF whenever URL changes
  useEffect(() => {
    if (!latestPdfUrl) {
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
      setNumPages(0);
      setCurrentPage(1);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        // Dynamic import to avoid SSR issues
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        pdfDocRef.current?.destroy();
        const doc = await pdfjsLib.getDocument(latestPdfUrl).promise as unknown as PDFDocumentProxy;
        if (cancelled) {
          doc.destroy();
          return;
        }
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        await renderPage(doc, 1, scale);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestPdfUrl]);

  // Re-render when page or scale changes (but PDF already loaded)
  useEffect(() => {
    if (!pdfDocRef.current || isLoading) return;
    renderPage(pdfDocRef.current, currentPage, scale).catch(console.error);
  }, [currentPage, scale, isLoading, renderPage]);

  function goPrev() {
    setCurrentPage((p) => Math.max(1, p - 1));
  }

  function goNext() {
    setCurrentPage((p) => Math.min(numPages, p + 1));
  }

  function zoomIn() {
    setScale((s) => Math.min(4, parseFloat((s + 0.25).toFixed(2))));
  }

  function zoomOut() {
    setScale((s) => Math.max(0.25, parseFloat((s - 0.25).toFixed(2))));
  }

  if (!latestPdfUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 text-muted-foreground">
        <FileTextIcon className="size-12 opacity-30" />
        <p className="text-sm">Compile your project to view the PDF</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-muted/20">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={goPrev}
            disabled={currentPage <= 1 || isLoading}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="min-w-[5rem] text-center text-xs tabular-nums text-muted-foreground">
            {numPages > 0 ? `${currentPage} / ${numPages}` : '—'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={goNext}
            disabled={currentPage >= numPages || isLoading}
            aria-label="Next page"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={zoomOut}
            disabled={scale <= 0.25 || isLoading}
            aria-label="Zoom out"
          >
            <ZoomOutIcon className="size-4" />
          </Button>
          <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={zoomIn}
            disabled={scale >= 4 || isLoading}
            aria-label="Zoom in"
          >
            <ZoomInIcon className="size-4" />
          </Button>
        </div>

        <a href={latestPdfUrl} download="output.pdf" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon" className="size-7" aria-label="Download PDF">
            <DownloadIcon className="size-4" />
          </Button>
        </a>
      </div>

      {/* Canvas area */}
      <div className="relative flex-1 overflow-auto">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="flex min-h-full justify-center p-4">
          <canvas
            ref={canvasRef}
            className="shadow-lg"
            style={{ display: error ? 'none' : 'block' }}
          />
        </div>
      </div>
    </div>
  );
}
