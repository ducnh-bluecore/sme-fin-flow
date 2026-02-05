 import { Button } from '@/components/ui/button';
 import { 
   Download, 
   FileJson, 
   FileCode, 
   FileText, 
   Package,
   Copy,
   Check
 } from 'lucide-react';
 import { useState } from 'react';
 import { 
   generateDesignTokensJSON,
   generateStandaloneCSS,
   generateTailwindPreset,
   generateFormattersCode,
   generateCnUtility,
   downloadFile,
   copyToClipboard
 } from '@/lib/theme-export';
 import { toast } from 'sonner';
 
 interface DownloadButtonProps {
   label: string;
   description: string;
   icon: React.ReactNode;
   onClick: () => void;
   variant?: 'default' | 'outline';
 }
 
 function DownloadButton({ label, description, icon, onClick, variant = 'outline' }: DownloadButtonProps) {
   return (
     <Button 
       variant={variant}
       className="h-auto py-4 px-5 flex flex-col items-start gap-2 text-left w-full"
       onClick={onClick}
     >
       <div className="flex items-center gap-2">
         {icon}
         <span className="font-semibold">{label}</span>
       </div>
       <span className="text-xs text-muted-foreground font-normal">{description}</span>
     </Button>
   );
 }
 
 export function ExportDownloadButtons() {
   const [copiedItem, setCopiedItem] = useState<string | null>(null);
 
   const handleCopy = async (content: string, name: string) => {
     await copyToClipboard(content);
     setCopiedItem(name);
     toast.success(`${name} copied to clipboard!`);
     setTimeout(() => setCopiedItem(null), 2000);
   };
 
   const handleDownload = (generator: () => string, filename: string, mimeType: string) => {
     const content = generator();
     downloadFile(content, filename, mimeType);
     toast.success(`Downloaded ${filename}`);
   };
 
   return (
     <div className="space-y-8">
       {/* Primary Downloads */}
       <div>
         <h3 className="text-lg font-semibold mb-4">Download Files</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           <DownloadButton
             label="Design Tokens (JSON)"
             description="Figma-compatible tokens file với colors, shadows, typography"
             icon={<FileJson className="h-5 w-5" />}
             onClick={() => handleDownload(generateDesignTokensJSON, 'bluecore-design-tokens.json', 'application/json')}
           />
 
           <DownloadButton
             label="CSS Variables"
             description="Standalone CSS file - không cần Tailwind"
             icon={<FileCode className="h-5 w-5" />}
             onClick={() => handleDownload(generateStandaloneCSS, 'bluecore-theme.css', 'text/css')}
           />
 
           <DownloadButton
             label="Tailwind Preset"
             description="Complete Tailwind configuration preset"
             icon={<FileText className="h-5 w-5" />}
             onClick={() => handleDownload(generateTailwindPreset, 'bluecore-preset.ts', 'text/typescript')}
           />
 
           <DownloadButton
             label="Formatters (VND)"
             description="Vietnamese locale formatting utilities"
             icon={<FileText className="h-5 w-5" />}
             onClick={() => handleDownload(generateFormattersCode, 'formatters.ts', 'text/typescript')}
           />
 
           <DownloadButton
             label="CN Utility"
             description="className merge utility (clsx + tailwind-merge)"
             icon={<FileText className="h-5 w-5" />}
             onClick={() => handleDownload(generateCnUtility, 'cn.ts', 'text/typescript')}
           />
 
           <DownloadButton
             label="Full Package"
             description="Tất cả files trong một lần tải"
             icon={<Package className="h-5 w-5" />}
             variant="default"
             onClick={() => {
               handleDownload(generateDesignTokensJSON, 'bluecore-design-tokens.json', 'application/json');
               handleDownload(generateStandaloneCSS, 'bluecore-theme.css', 'text/css');
               handleDownload(generateTailwindPreset, 'bluecore-preset.ts', 'text/typescript');
               handleDownload(generateFormattersCode, 'formatters.ts', 'text/typescript');
               handleDownload(generateCnUtility, 'cn.ts', 'text/typescript');
             }}
           />
         </div>
       </div>
 
       {/* Quick Copy */}
       <div>
         <h3 className="text-lg font-semibold mb-4">Quick Copy</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Button
             variant="outline"
             className="justify-start gap-2"
             onClick={() => handleCopy(generateDesignTokensJSON(), 'Design Tokens')}
           >
             {copiedItem === 'Design Tokens' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
             Copy Design Tokens JSON
           </Button>
 
           <Button
             variant="outline"
             className="justify-start gap-2"
             onClick={() => handleCopy(generateStandaloneCSS(), 'CSS')}
           >
             {copiedItem === 'CSS' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
             Copy CSS Variables
           </Button>
 
           <Button
             variant="outline"
             className="justify-start gap-2"
             onClick={() => handleCopy(generateTailwindPreset(), 'Tailwind')}
           >
             {copiedItem === 'Tailwind' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
             Copy Tailwind Preset
           </Button>
 
           <Button
             variant="outline"
             className="justify-start gap-2"
             onClick={() => handleCopy(generateFormattersCode(), 'Formatters')}
           >
             {copiedItem === 'Formatters' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
             Copy Formatters
           </Button>
         </div>
       </div>
     </div>
   );
 }