 import { Copy, Check } from 'lucide-react';
 import { useState } from 'react';
 import { 
   BLUECORE_BRAND_COLORS, 
   SEMANTIC_COLORS, 
   SIDEBAR_COLORS, 
   CHART_COLORS,
   copyToClipboard 
 } from '@/lib/theme-export';
 
 interface ColorSwatchProps {
   name: string;
   hex: string;
   hsl: string;
 }
 
 function ColorSwatch({ name, hex, hsl }: ColorSwatchProps) {
   const [copied, setCopied] = useState(false);
 
   const handleCopy = async () => {
     await copyToClipboard(hex);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000);
   };
 
   const isDark = isColorDark(hex);
 
   return (
     <div 
       className="group relative rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-elevated"
       onClick={handleCopy}
     >
       <div 
         className="h-20 flex items-center justify-center"
         style={{ backgroundColor: hex }}
       >
         <span className={`opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-white' : 'text-foreground'}`}>
           {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
         </span>
       </div>
       <div className="p-2 bg-card border-t border-border">
         <p className="text-xs font-medium text-foreground">{name}</p>
         <p className="text-[10px] text-muted-foreground font-mono">{hex}</p>
         <p className="text-[10px] text-muted-foreground font-mono truncate">{hsl}</p>
       </div>
     </div>
   );
 }
 
 function isColorDark(hex: string): boolean {
   const r = parseInt(hex.slice(1, 3), 16);
   const g = parseInt(hex.slice(3, 5), 16);
   const b = parseInt(hex.slice(5, 7), 16);
   const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
   return luminance < 0.5;
 }
 
 interface ColorGroupProps {
   title: string;
   description: string;
   colors: Record<string, { hex: string; hsl: string }>;
   prefix?: string;
 }
 
 function ColorGroup({ title, description, colors, prefix = '' }: ColorGroupProps) {
   return (
     <div className="space-y-4">
       <div>
         <h3 className="text-lg font-semibold text-foreground">{title}</h3>
         <p className="text-sm text-muted-foreground">{description}</p>
       </div>
       <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
         {Object.entries(colors).map(([key, value]) => (
           <ColorSwatch
             key={key}
             name={prefix ? `${prefix}-${key}` : key}
             hex={value.hex}
             hsl={value.hsl}
           />
         ))}
       </div>
     </div>
   );
 }
 
 export function ColorPalettePreview() {
   return (
     <div className="space-y-10">
       <ColorGroup
         title="Bluecore Brand Palette"
         description="Primary brand colors from 50 (lightest) to 900 (darkest)"
         colors={BLUECORE_BRAND_COLORS}
         prefix="bluecore"
       />
 
       <ColorGroup
         title="Semantic Colors"
         description="Contextual colors for UI elements and states"
         colors={SEMANTIC_COLORS}
       />
 
       <ColorGroup
         title="Sidebar Colors"
         description="Dark theme colors for navigation sidebar"
         colors={SIDEBAR_COLORS}
         prefix="sidebar"
       />
 
       <ColorGroup
         title="Chart Colors"
         description="Optimized palette for data visualization"
         colors={CHART_COLORS}
         prefix="chart"
       />
     </div>
   );
 }