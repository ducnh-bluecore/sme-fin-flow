import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const InventoryAllocationPage = lazy(() => import('@/pages/InventoryAllocationPage'));

export default function CommandAllocationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <InventoryAllocationPage />
    </Suspense>
  );
}
