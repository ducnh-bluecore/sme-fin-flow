 import { useState } from 'react';
 import { Button } from '@/components/ui/button';
 import { Copy, Check } from 'lucide-react';
 import { copyToClipboard } from '@/lib/theme-export';
 import { toast } from 'sonner';
 
 interface CodePreviewProps {
   code: string;
   language: string;
   title?: string;
   maxHeight?: string;
 }
 
 export function CodePreview({ code, language, title, maxHeight = '400px' }: CodePreviewProps) {
   const [copied, setCopied] = useState(false);
 
   const handleCopy = async () => {
     await copyToClipboard(code);
     setCopied(true);
     toast.success('Copied to clipboard!');
     setTimeout(() => setCopied(false), 2000);
   };
 
   return (
     <div className="border border-border rounded-lg overflow-hidden">
       <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
         <div className="flex items-center gap-3">
           {title && <span className="font-medium text-sm">{title}</span>}
           <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">{language}</span>
         </div>
         <Button variant="ghost" size="sm" onClick={handleCopy}>
           {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
         </Button>
       </div>
       <pre 
         className="p-4 overflow-auto text-sm font-mono bg-sidebar text-sidebar-foreground"
         style={{ maxHeight }}
       >
         <code>{code}</code>
       </pre>
     </div>
   );
 }
 
 interface CodeTabsProps {
   tabs: Array<{
     id: string;
     label: string;
     code: string;
     language: string;
   }>;
   maxHeight?: string;
 }
 
 export function CodeTabs({ tabs, maxHeight = '400px' }: CodeTabsProps) {
   const [activeTab, setActiveTab] = useState(tabs[0]?.id);
   const [copied, setCopied] = useState(false);
 
   const activeCode = tabs.find(t => t.id === activeTab);
 
   const handleCopy = async () => {
     if (activeCode) {
       await copyToClipboard(activeCode.code);
       setCopied(true);
       toast.success('Copied to clipboard!');
       setTimeout(() => setCopied(false), 2000);
     }
   };
 
   return (
     <div className="border border-border rounded-lg overflow-hidden">
       <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
         <div className="flex gap-1">
           {tabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`px-3 py-1 text-sm rounded transition-colors ${
                 activeTab === tab.id 
                   ? 'bg-primary text-primary-foreground' 
                   : 'text-muted-foreground hover:text-foreground'
               }`}
             >
               {tab.label}
             </button>
           ))}
         </div>
         <Button variant="ghost" size="sm" onClick={handleCopy}>
           {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
         </Button>
       </div>
       <pre 
         className="p-4 overflow-auto text-sm font-mono bg-sidebar text-sidebar-foreground"
         style={{ maxHeight }}
       >
         <code>{activeCode?.code || ''}</code>
       </pre>
     </div>
   );
 }