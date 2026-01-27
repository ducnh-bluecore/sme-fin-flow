import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { FileImportDialog } from '@/components/import/FileImportDialog';

interface InventoryImportButtonProps {
  onImportComplete?: () => void;
}

export function InventoryImportButton({ onImportComplete }: InventoryImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Import tồn kho
      </Button>
      
      <FileImportDialog 
        open={isOpen} 
        onOpenChange={setIsOpen}
        onImportComplete={() => {
          onImportComplete?.();
          setIsOpen(false);
        }}
      />
    </>
  );
}
