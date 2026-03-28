'use client';

import { useState, useEffect } from 'react';
import { AlertTriangleIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editor-store';

export function RecoveryBanner() {
  const [show, setShow] = useState(false);
  const tabs = useEditorStore((s) => s.tabs);

  useEffect(() => {
    // Show banner if there are dirty tabs on mount (recovered from crash)
    const hasDirtyTabs = tabs.some((t) => t.dirty);
    if (hasDirtyTabs && tabs.length > 0) {
      setShow(true);
    }
  }, []); // Only check on mount

  if (!show) return null;

  const dirtyCount = tabs.filter((t) => t.dirty).length;
  if (dirtyCount === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
      <AlertTriangleIcon className="size-3.5 shrink-0" />
      <span>Recovered {dirtyCount} unsaved {dirtyCount === 1 ? 'file' : 'files'} from your last session</span>
      <Button size="icon-xs" variant="ghost" onClick={() => setShow(false)} className="ml-auto" aria-label="Dismiss">
        <XIcon className="size-3" />
      </Button>
    </div>
  );
}
