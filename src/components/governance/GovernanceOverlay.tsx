/**
 * ============================================
 * GOVERNANCE OVERLAY COMPONENT
 * ============================================
 * 
 * Automatically shows SSOTComplianceDashboard when ?governance=1 is in URL.
 * Place this in DashboardLayout to enable across all pages.
 */

import { useSearchParams } from 'react-router-dom';
import { SSOTComplianceDashboard } from './SSOTComplianceDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Shield } from 'lucide-react';
import { useState } from 'react';

export function GovernanceOverlay() {
  const [searchParams] = useSearchParams();
  const showGovernance = searchParams.get('governance') === '1';
  const [isMinimized, setIsMinimized] = useState(false);

  if (!showGovernance) return null;

  return (
    <AnimatePresence>
      {!isMinimized ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6"
        >
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10"
              onClick={() => setIsMinimized(true)}
            >
              <X className="h-4 w-4" />
            </Button>
            <SSOTComplianceDashboard />
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 border-primary/30"
          >
            <Shield className="h-4 w-4 text-primary" />
            Show Governance Dashboard
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
