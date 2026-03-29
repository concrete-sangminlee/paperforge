'use client';

import { useState, useEffect } from 'react';
import { AlertTriangleIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editor-store';
import { toast } from 'sonner';

export function RecoveryBanner() {
  const [show, setShow] = useState(false);
  const tabs = useEditorStore((s) => s.tabs);

  useEffect(() => {
    // Show banner if there are dirty tabs on mount (recovered from crash)
    const hasDirtyTabs = tabs.some((t) => t.dirty);
    if (hasDirtyTabs && tabs.length > 0) {
      setShow(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on mount
  }, []);

  if (!show) return null;

  const dirtyCount = tabs.filter((t) => t.dirty).length;
  if (dirtyCount === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
    >
      <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>Recovered {dirtyCount} unsaved {dirtyCount === 1 ? 'file' : 'files'} from your last session</span>
      <div className="ml-auto flex items-center gap-1">
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('save-all'));
            toast.success('Saving all recovered files...');
            setShow(false);
          }}
          className="h-5 border-amber-300 bg-amber-100 px-2 text-[10px] font-medium text-amber-800 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900"
        >
          Save All
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={() => setShow(false)} aria-label="Dismiss recovery notification">
          <XIcon className="size-3" />
        </Button>
      </div>
    </div>
  );
}
