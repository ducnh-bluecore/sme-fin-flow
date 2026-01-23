import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type CrashInfo = {
  message: string;
  stack?: string;
  source?: string;
  kind?: 'error' | 'unhandledrejection' | 'console.error';
  at?: string;
};

type DebugInfo = {
  href: string;
  userId: string | null;
  activeTenantId: string | null;
  visibility: DocumentVisibilityState;
};

/**
 * Captures global runtime errors that may not be caught by React ErrorBoundaries
 * (e.g. unhandled promise rejections), and surfaces them in a small overlay.
 * This is a debugging aid to eliminate “white screen with no clue”.
 */
export function CrashOverlay() {
  const [crash, setCrash] = useState<CrashInfo | null>(null);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [open, setOpen] = useState(true);

  const isDev = useMemo(() => {
    // Vite sets import.meta.env.DEV; keep a safe fallback.
    try {
      return !!import.meta.env.DEV;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isDev) return;

    let cancelled = false;

    const refreshDebug = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id ?? null;

        let activeTenantId: string | null = null;
        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('active_tenant_id')
            .eq('id', userId)
            .maybeSingle();
          activeTenantId = (profile?.active_tenant_id as string | null) ?? null;
        }

        if (cancelled) return;
        setDebug({
          href: window.location.href,
          userId,
          activeTenantId,
          visibility: document.visibilityState,
        });
      } catch (e) {
        // If even this fails, keep a minimal signal.
        if (cancelled) return;
        setDebug({
          href: window.location.href,
          userId: null,
          activeTenantId: null,
          visibility: document.visibilityState,
        });
        console.error('[CrashOverlay] refreshDebug failed', e);
      }
    };

    refreshDebug();

    const onVisibility = () => {
      setDebug((prev) =>
        prev
          ? { ...prev, href: window.location.href, visibility: document.visibilityState }
          : {
              href: window.location.href,
              userId: null,
              activeTenantId: null,
              visibility: document.visibilityState,
            }
      );
    };

    // Capture console.error too (lots of libs log errors without throwing).
    const originalConsoleError = console.error.bind(console);
    console.error = (...args: any[]) => {
      try {
        const message = args
          .map((a) => {
            if (a instanceof Error) return a.message;
            if (typeof a === 'string') return a;
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(' ')
          .slice(0, 2000);
        setCrash({
          kind: 'console.error',
          message,
          at: new Date().toISOString(),
        });
      } catch {
        // ignore
      }
      originalConsoleError(...args);
    };

    const onError = (event: ErrorEvent) => {
      const err = event.error as Error | undefined;
      setCrash({
        kind: 'error',
        message: err?.message || event.message || 'Unknown runtime error',
        stack: err?.stack,
        source: event.filename,
        at: new Date().toISOString(),
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
        kind: 'unhandledrejection',
        message,
        stack: reason?.stack ? String(reason.stack) : undefined,
        at: new Date().toISOString(),
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      document.removeEventListener('visibilitychange', onVisibility);

      // restore console
      console.error = originalConsoleError;
      cancelled = true;
    };
  }, [isDev]);

  // In prod (published), keep this overlay completely off.
  if (!isDev) return null;

  // If user closed it, keep it closed for this session.
  if (!open) return null;

  // Always show a small debug badge in Preview so we can debug “white screen”.
  const hasCrash = !!crash;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[min(560px,calc(100vw-2rem))] rounded-xl border border-destructive/30 bg-background/95 backdrop-blur p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-lg bg-destructive/10 p-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              {hasCrash ? 'Runtime error' : 'Debug (Preview)'}
            </div>
            {hasCrash ? (
              <div className="mt-1 text-xs text-muted-foreground break-words">
                {crash?.message}
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground break-words">
                Theo dõi trạng thái app để bắt lỗi “trắng trang”.
              </div>
            )}
            {hasCrash && crash?.source && (
              <div className="mt-1 text-[11px] text-muted-foreground break-words">
                Source: {crash.source}
              </div>
            )}
            {hasCrash && crash?.kind && (
              <div className="mt-1 text-[11px] text-muted-foreground break-words">
                Kind: {crash.kind}{crash.at ? ` • ${crash.at}` : ''}
              </div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setCrash(null);
            setOpen(false);
          }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {debug && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3 text-[11px] leading-snug text-muted-foreground">
          <div className="truncate"><span className="font-medium">URL:</span> {debug.href}</div>
          <div className="truncate"><span className="font-medium">User:</span> {debug.userId ?? 'null'}</div>
          <div className="truncate"><span className="font-medium">Tenant:</span> {debug.activeTenantId ?? 'null'}</div>
          <div className="truncate"><span className="font-medium">Visibility:</span> {debug.visibility}</div>
        </div>
      )}

      {hasCrash && crash?.stack && (
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap">
          {crash.stack}
        </pre>
      )}
    </div>
  );
}
