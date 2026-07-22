/**
 * ExportDialog — Modal dialog offering Copy/Download of Markdown proposal or JSON.
 */

"use client";

import * as React from 'react';
import { Check, Copy, Download, FileText, Code, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  optionId: string;
}

export function ExportDialog({ open, onOpenChange, projectId, optionId }: ExportDialogProps) {
  const [exportFormat, setExportFormat] = React.useState<'json' | 'markdown'>('markdown');
  const [copied, setCopied] = React.useState(false);
  const [payload, setPayload] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      loadExportPayload();
    }
  }, [open, exportFormat]);

  async function loadExportPayload() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/architecture/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, format: exportFormat, optionId }),
      });

      if (res.ok) {
        const data = await res.json();
        setPayload(
          exportFormat === 'json'
            ? JSON.stringify(data.payload, null, 2)
            : data.payload,
        );
      } else {
        const data = await res.json().catch(() => ({}));
        setPayload(`// ${data.error || 'Failed to load export contents.'}`);
      }
    } catch {
      setPayload('// Failed to load export contents.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (insecure context / permissions).
      // Fall back to downloading the file instead so the user still gets the spec.
      handleDownload();
    }
  }

  function handleDownload() {
    const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `salespilot_architecture_${optionId}.${exportFormat === 'json' ? 'json' : 'md'}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Cloud Solution Architecture</DialogTitle>
          <DialogDescription>
            Download or copy the design specs for pricing (Phase 4) or customer presentations.
          </DialogDescription>
        </DialogHeader>

        {/* Format selector */}
        <div className="flex gap-2 border-b border-border-subtle pb-3">
          <Button
            variant={exportFormat === 'markdown' ? 'default' : 'secondary'}
            onClick={() => setExportFormat('markdown')}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <FileText className="h-4 w-4" /> Markdown Proposal
          </Button>

          <Button
            variant={exportFormat === 'json' ? 'default' : 'secondary'}
            onClick={() => setExportFormat('json')}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Code className="h-4 w-4" /> Architecture JSON (Phase 4)
          </Button>
        </div>

        {/* Payload */}
        <div className="relative">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-border-subtle bg-background">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent" />
            </div>
          ) : (
            <pre className="h-64 overflow-auto rounded-lg border border-border-subtle bg-background p-3 font-mono text-[11px] text-foreground leading-relaxed">
              {payload}
            </pre>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={handleDownload} disabled={isLoading}>
            <Download className="h-4 w-4" /> Download File
          </Button>
          <Button onClick={handleCopy} disabled={isLoading} className="flex items-center gap-1.5">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
