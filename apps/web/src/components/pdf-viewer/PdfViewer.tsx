"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Download, 
  ExternalLink, 
  FileText, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  X
} from "lucide-react";
import { API_URL, fetchApi } from "@/lib/api";

interface PdfViewerProps {
  documentId: string;
  documentName?: string;
  onClose?: () => void;
  className?: string;
  initialPage?: number;
}

export default function PdfViewer({
  documentId,
  documentName = "Document.pdf",
  onClose,
  className = "",
  initialPage = 1,
}: PdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageInput, setPageInput] = useState(initialPage.toString());
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const fetchPdf = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        const streamUrl = `${API_URL}/documents/${documentId}/file/`;
        const response = await fetch(streamUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (response.ok) {
          const blob = await response.blob();
          if (isCancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          setPdfUrl((prev) => {
            if (prev && prev.startsWith("blob:")) {
              URL.revokeObjectURL(prev);
            }
            return objectUrl;
          });
          setIsLoading(false);
          return;
        }

        const downloadRes = await fetchApi(`/documents/${documentId}/download/`);
        if (isCancelled) return;
        if (downloadRes?.data?.url) {
          setPdfUrl(downloadRes.data.url);
          setIsLoading(false);
          return;
        }

        throw new Error("Unable to load document stream or presigned URL");
      } catch (err) {
        if (isCancelled) return;
        console.error("Failed to load PDF:", err);
        setError(err instanceof Error ? err.message : "Failed to load PDF document");
        setIsLoading(false);
      }
    };

    fetchPdf();

    return () => {
      isCancelled = true;
      setPdfUrl((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    };
  }, [documentId, reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setReloadKey((prev) => prev + 1);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev + 25, 250));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const resetZoom = () => setZoom(100);

  const nextPage = () => {
    setPage((prev) => {
      const next = prev + 1;
      setPageInput(next.toString());
      return next;
    });
  };

  const prevPage = () => {
    setPage((prev) => {
      const p = Math.max(prev - 1, 1);
      setPageInput(p.toString());
      return p;
    });
  };

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p > 0) {
      setPage(p);
    } else {
      setPageInput(page.toString());
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = documentName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenExternal = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank");
  };

  const viewerSrc = pdfUrl ? `${pdfUrl}#page=${page}&zoom=${zoom}` : "";

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col h-full w-full glass-dark border border-white/10 rounded-2xl overflow-hidden bg-black/40 ${className}`}
    >
      {/* Top Toolbar */}
      <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-3 select-none flex-wrap">
        {/* Document Title & Icon */}
        <div className="flex items-center gap-2 min-w-0 max-w-[200px] sm:max-w-xs">
          <div className="p-1.5 bg-brand-500/10 text-brand-400 rounded-lg shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-gray-200 truncate" title={documentName}>
            {documentName}
          </span>
        </div>

        {/* Center Controls: Page Navigation & Zoom */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Page Navigation */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={prevPage}
              disabled={page <= 1}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 rounded transition-colors"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <form onSubmit={handlePageSubmit} className="flex items-center px-1">
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageSubmit}
                className="w-8 text-center text-xs bg-transparent text-white focus:outline-none focus:bg-white/10 rounded px-0.5 py-0.5"
                title="Current Page"
                aria-label="Current Page"
              />
            </form>
            <button
              type="button"
              onClick={nextPage}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= 50}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 rounded transition-colors"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="px-1.5 text-[11px] font-medium text-gray-300 hover:text-white transition-colors"
              title="Reset Zoom (100%)"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= 250}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 rounded transition-colors"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="p-1 text-gray-400 hover:text-white border-l border-white/10 ml-0.5 rounded transition-colors"
              title="Reset to Default"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Controls: Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!pdfUrl}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-lg transition-colors"
            title="Download PDF"
            aria-label="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleOpenExternal}
            disabled={!pdfUrl}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-lg transition-colors"
            title="Open in New Tab"
            aria-label="Open in New Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-1"
              title="Close Viewer"
              aria-label="Close Viewer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Viewer Canvas / Content */}
      <div className="flex-1 relative w-full h-full bg-[#18181b] overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
            <p className="text-xs">Loading PDF document...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-xs">
            <div className="p-3 bg-red-500/10 text-red-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">Preview unavailable</p>
            <p className="text-xs text-gray-400">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        ) : viewerSrc ? (
          <iframe
            key={viewerSrc}
            src={viewerSrc}
            title={documentName}
            className="w-full h-full border-0 bg-[#262626]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
            <FileText className="w-8 h-8 opacity-40" />
            <p className="text-xs">No PDF stream available</p>
          </div>
        )}
      </div>
    </div>
  );
}
