 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Button } from '@/components/ui/button';
 import { ArrowLeft, Palette, Component, Download, Code, BookOpen } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
 import {
   ColorPalettePreview,
   ComponentShowcase,
   ExportDownloadButtons,
   CodePreview,
 } from '@/components/theme-export';
 import {
   generateDesignTokensJSON,
   generateStandaloneCSS,
   generateTailwindPreset,
   SHADOWS,
   TYPOGRAPHY,
 } from '@/lib/theme-export';
 
 export default function ThemeExportPage() {
   const navigate = useNavigate();
 
   return (
     <div className="min-h-screen bg-background">
       {/* Header */}
       <header className="sticky top-0 z-50 bg-card border-b border-border">
         <div className="container mx-auto px-6 py-4">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                 <ArrowLeft className="h-5 w-5" />
               </Button>
               <div>
                 <h1 className="text-xl font-bold text-foreground">Bluecore Design System</h1>
                 <p className="text-sm text-muted-foreground">Export theme, components, và utilities</p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">v1.0</span>
             </div>
           </div>
         </div>
       </header>
 
       {/* Main Content */}
       <main className="container mx-auto px-6 py-8">
         <Tabs defaultValue="overview" className="space-y-8">
           <TabsList className="grid w-full max-w-2xl grid-cols-5">
             <TabsTrigger value="overview" className="gap-2">
               <BookOpen className="h-4 w-4" />
               <span className="hidden sm:inline">Overview</span>
             </TabsTrigger>
             <TabsTrigger value="colors" className="gap-2">
               <Palette className="h-4 w-4" />
               <span className="hidden sm:inline">Colors</span>
             </TabsTrigger>
             <TabsTrigger value="components" className="gap-2">
               <Component className="h-4 w-4" />
               <span className="hidden sm:inline">Components</span>
             </TabsTrigger>
             <TabsTrigger value="code" className="gap-2">
               <Code className="h-4 w-4" />
               <span className="hidden sm:inline">Code</span>
             </TabsTrigger>
             <TabsTrigger value="download" className="gap-2">
               <Download className="h-4 w-4" />
               <span className="hidden sm:inline">Download</span>
             </TabsTrigger>
           </TabsList>
 
           {/* Overview Tab */}
           <TabsContent value="overview" className="space-y-8">
             <section className="max-w-3xl">
               <h2 className="text-2xl font-bold mb-4">Bluecore Design System</h2>
               <p className="text-muted-foreground mb-6">
                 Finance-grade visual discipline. Decision-first. CFO-ready.
               </p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="data-card">
                   <h3 className="font-semibold mb-2">Design Tokens</h3>
                   <ul className="text-sm text-muted-foreground space-y-1">
                     <li>• 10 brand colors (50-900)</li>
                     <li>• 20+ semantic colors</li>
                     <li>• 8 sidebar colors</li>
                     <li>• 5 chart colors</li>
                     <li>• 6 shadow levels</li>
                   </ul>
                 </div>
 
                 <div className="data-card">
                   <h3 className="font-semibold mb-2">Typography</h3>
                   <ul className="text-sm text-muted-foreground space-y-1">
                     <li>• Font: Be Vietnam Pro</li>
                     <li>• Weights: 300-800</li>
                     <li>• Vietnamese locale support</li>
                     <li>• Tabular numbers</li>
                   </ul>
                 </div>
 
                 <div className="data-card">
                   <h3 className="font-semibold mb-2">Components</h3>
                   <ul className="text-sm text-muted-foreground space-y-1">
                     <li>• Decision Cards (Critical/Warning/Success)</li>
                     <li>• KPI Cards với indicators</li>
                     <li>• Status Badges</li>
                     <li>• Data Tables</li>
                     <li>• 50+ shadcn/ui components</li>
                   </ul>
                 </div>
 
                 <div className="data-card">
                   <h3 className="font-semibold mb-2">Utilities</h3>
                   <ul className="text-sm text-muted-foreground space-y-1">
                     <li>• VND currency formatter</li>
                     <li>• Percentage formatter</li>
                     <li>• Date/time formatters</li>
                     <li>• cn() className utility</li>
                   </ul>
                 </div>
               </div>
             </section>
 
             {/* Shadows Preview */}
             <section>
               <h3 className="text-lg font-semibold mb-4">Shadows</h3>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                 {Object.entries(SHADOWS).map(([name, value]) => (
                   <div 
                     key={name}
                     className="h-24 bg-card rounded-lg flex items-center justify-center"
                     style={{ boxShadow: value }}
                   >
                     <span className="text-sm font-medium">{name}</span>
                   </div>
                 ))}
               </div>
             </section>
 
             {/* Typography Preview */}
             <section>
               <h3 className="text-lg font-semibold mb-4">Typography Scale</h3>
               <div className="space-y-4 max-w-2xl">
                 {Object.entries(TYPOGRAPHY.weights).map(([name, weight]) => (
                   <div key={name} className="flex items-baseline gap-4">
                     <span className="w-24 text-sm text-muted-foreground">{weight}</span>
                     <span 
                       className="text-xl"
                       style={{ fontWeight: weight }}
                     >
                       {name.charAt(0).toUpperCase() + name.slice(1)} - The quick brown fox
                     </span>
                   </div>
                 ))}
               </div>
             </section>
           </TabsContent>
 
           {/* Colors Tab */}
           <TabsContent value="colors">
             <ColorPalettePreview />
           </TabsContent>
 
           {/* Components Tab */}
           <TabsContent value="components">
             <ComponentShowcase />
           </TabsContent>
 
           {/* Code Tab */}
           <TabsContent value="code" className="space-y-8">
             <section>
               <h3 className="text-lg font-semibold mb-4">Design Tokens (JSON)</h3>
               <CodePreview 
                 code={generateDesignTokensJSON()}
                 language="json"
                 title="bluecore-design-tokens.json"
               />
             </section>
 
             <section>
               <h3 className="text-lg font-semibold mb-4">CSS Variables</h3>
               <CodePreview 
                 code={generateStandaloneCSS()}
                 language="css"
                 title="bluecore-theme.css"
               />
             </section>
 
             <section>
               <h3 className="text-lg font-semibold mb-4">Tailwind Preset</h3>
               <CodePreview 
                 code={generateTailwindPreset()}
                 language="typescript"
                 title="bluecore-preset.ts"
               />
             </section>
           </TabsContent>
 
           {/* Download Tab */}
           <TabsContent value="download">
             <ExportDownloadButtons />
             
             {/* Usage Guide */}
             <section className="mt-10 max-w-3xl">
               <h3 className="text-lg font-semibold mb-4">Hướng dẫn Sử dụng</h3>
               <div className="space-y-6">
                 <div className="data-card">
                   <h4 className="font-semibold mb-2">1. Sử dụng CSS Variables (Không cần Tailwind)</h4>
                   <pre className="text-sm bg-muted p-3 rounded-lg overflow-x-auto">
                     <code>{`<link rel="stylesheet" href="bluecore-theme.css">
 
 <div class="decision-card-critical">
   <p>Critical alert!</p>
 </div>`}</code>
                   </pre>
                 </div>
 
                 <div className="data-card">
                   <h4 className="font-semibold mb-2">2. Sử dụng Tailwind Preset</h4>
                   <pre className="text-sm bg-muted p-3 rounded-lg overflow-x-auto">
                     <code>{`// tailwind.config.ts
 import { bluecorePreset } from './bluecore-preset';
 
 export default {
   presets: [bluecorePreset],
   content: ['./src/**/*.{ts,tsx}'],
 };`}</code>
                   </pre>
                 </div>
 
                 <div className="data-card">
                   <h4 className="font-semibold mb-2">3. Import Design Tokens vào Figma</h4>
                   <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                     <li>Tải file bluecore-design-tokens.json</li>
                     <li>Mở Figma, vào Plugins → Tokens Studio</li>
                     <li>Import JSON file</li>
                     <li>Apply tokens vào design</li>
                   </ol>
                 </div>
 
                 <div className="data-card">
                   <h4 className="font-semibold mb-2">4. Sử dụng Formatters</h4>
                   <pre className="text-sm bg-muted p-3 rounded-lg overflow-x-auto">
                     <code>{`import { formatCurrency, formatPercent } from './formatters';
 
 formatCurrency(1500000);  // "₫1,500,000"
 formatPercent(15.5);      // "15.5%"`}</code>
                   </pre>
                 </div>
               </div>
             </section>
           </TabsContent>
         </Tabs>
       </main>
 
       {/* Footer */}
       <footer className="border-t border-border py-6 mt-12">
         <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
           <p>Bluecore Design System • Finance-grade visual discipline</p>
         </div>
       </footer>
     </div>
   );
 }