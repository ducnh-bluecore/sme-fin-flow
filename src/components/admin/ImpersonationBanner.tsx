import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, X } from 'lucide-react';
import { useImpersonation } from '@/hooks/useImpersonation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedTenantName, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isImpersonating) return null;

  const handleStop = async () => {
    const success = await stopImpersonation();
    if (success) {
      navigate('/admin');
    }
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed bottom-4 right-4 z-[100]"
    >
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-card border border-amber-500/50 rounded-xl shadow-lg p-4 min-w-[280px]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Đang xem với tư cách</p>
                <p className="font-semibold text-foreground truncate max-w-[180px]">
                  {impersonatedTenantName}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground -mt-1 -mr-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={handleStop}
              className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-white"
            >
              Thoát chế độ xem
            </Button>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-full shadow-lg transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Super Admin</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
