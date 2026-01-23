import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CrashInfo = {
  message: string;
  stack?: string;
  source?: string;
};

/**
 * Captures global runtime errors that may not be caught by React ErrorBoundaries
 * (e.g. unhandled promise rejections), and surfaces them in a small overlay.
 * This is a debugging aid to eliminate “white screen with no clue”.
 */
export function CrashOverlay() {
  const [crash, setCrash] = useState<CrashInfo | null>(null);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const err = event.error as Error | undefined;
      setCrash({
        message: err?.message || event.message || 'Unknown runtime error',
        stack: err?.stack,
        source: event.filename,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as any;
      const message =
        typeof reason === 'string'
          ? reason
          : reason?.message
            ? String(reason.message)
            : 'Unhandled promise rejection';
      setCrash({
        message,
        stack: reason?.stack ? String(reason.stack) : undefined,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  if (!crash) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[min(560px,calc(100vw-2rem))] rounded-xl border border-destructive/30 bg-background/95 backdrop-blur p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-lg bg-destructive/10 p-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">Runtime error</div>
            <div className="mt-1 text-xs text-muted-foreground break-words">
              {crash.message}
            </div>
            {crash.source && (
              <div className="mt-1 text-[11px] text-muted-foreground break-words">
                Source: {crash.source}
              </div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCrash(null)}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {crash.stack && (
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap">
          {crash.stack}
        </pre>
      )}
    </div>
  );
}
