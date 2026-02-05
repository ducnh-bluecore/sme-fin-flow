 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { 
   AlertCircle, 
   CheckCircle, 
   Info, 
   AlertTriangle,
   ArrowUp,
   ArrowDown,
   TrendingUp,
   DollarSign,
   Users,
   ShoppingCart
 } from 'lucide-react';
 import { formatCurrency, formatPercent } from '@/lib/format';
 
 export function ComponentShowcase() {
   return (
     <div className="space-y-10">
       {/* Buttons */}
       <section className="space-y-4">
         <h3 className="text-lg font-semibold">Buttons</h3>
         <div className="flex flex-wrap gap-3">
           <Button>Primary</Button>
           <Button variant="secondary">Secondary</Button>
           <Button variant="outline">Outline</Button>
           <Button variant="ghost">Ghost</Button>
           <Button variant="destructive">Destructive</Button>
           <Button variant="link">Link</Button>
         </div>
         <div className="flex flex-wrap gap-3">
           <Button size="sm">Small</Button>
           <Button size="default">Default</Button>
           <Button size="lg">Large</Button>
         </div>
       </section>
 
       {/* Badges */}
       <section className="space-y-4">
         <h3 className="text-lg font-semibold">Badges & Status</h3>
         <div className="flex flex-wrap gap-3">
           <Badge>Default</Badge>
           <Badge variant="secondary">Secondary</Badge>
           <Badge variant="outline">Outline</Badge>
           <Badge variant="destructive">Destructive</Badge>
         </div>
         <div className="flex flex-wrap gap-3">
           <span className="status-badge success">
             <CheckCircle className="h-3 w-3 mr-1" /> Success
           </span>
           <span className="status-badge warning">
             <AlertTriangle className="h-3 w-3 mr-1" /> Warning
           </span>
           <span className="status-badge danger">
             <AlertCircle className="h-3 w-3 mr-1" /> Danger
           </span>
           <span className="status-badge info">
             <Info className="h-3 w-3 mr-1" /> Info
           </span>
           <span className="status-badge neutral">Neutral</span>
         </div>
       </section>
 
       {/* Form Elements */}
       <section className="space-y-4">
         <h3 className="text-lg font-semibold">Form Elements</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
           <Input placeholder="Default input" />
           <Input placeholder="Disabled" disabled />
           <Input placeholder="With value" defaultValue="₫1,500,000" />
         </div>
       </section>
 
       {/* Decision Cards */}
       <section className="space-y-4">
         <h3 className="text-lg font-semibold">Decision Cards</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="decision-card-critical">
             <div className="flex items-center gap-2 mb-2">
               <AlertCircle className="h-5 w-5 text-destructive" />
               <span className="font-semibold text-destructive">Critical Alert</span>
             </div>
             <p className="text-sm text-muted-foreground">SKU ABC-123 đang lỗ margin -15%, cần dừng ngay.</p>
             <p className="text-lg font-bold mt-2 text-destructive">{formatCurrency(-45000000)}</p>
           </div>
 
           <div className="decision-card-warning">
             <div className="flex items-center gap-2 mb-2">
               <AlertTriangle className="h-5 w-5 text-warning" />
               <span className="font-semibold">Cảnh báo</span>
             </div>
             <p className="text-sm text-muted-foreground">Inventory days tăng 20% so với tháng trước.</p>
             <p className="text-lg font-bold mt-2">{formatPercent(20)}</p>
           </div>
 
           <div className="decision-card-success">
             <div className="flex items-center gap-2 mb-2">
               <CheckCircle className="h-5 w-5 text-success" />
               <span className="font-semibold text-success">Resolved</span>
             </div>
             <p className="text-sm text-muted-foreground">Campaign ROI đã đạt target +25%.</p>
             <p className="text-lg font-bold mt-2 text-success">{formatPercent(25)}</p>
           </div>
         </div>
       </section>
 
       {/* KPI Cards */}
       <section className="space-y-4">
         <h3 className="text-lg font-semibold">KPI Cards</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="kpi-card success">
             <div className="flex items-center justify-between">
               <span className="text-sm text-muted-foreground">Net Revenue</span>
               <DollarSign className="h-4 w-4 text-muted-foreground" />
             </div>
             <p className="text-2xl font-bold mt-1">{formatCurrency(2500000000)}</p>
             <div className="flex items-center gap-1 mt-2 text-success text-sm">
               <ArrowUp className="h-4 w-4" />
               <span>+12.5%</span>
             </div>
           </div>
 
           <div className="kpi-card warning">
             <div className="flex items-center justify-between">
               <span className="text-sm text-muted-foreground">Orders</span>
               <ShoppingCart className="h-4 w-4 text-muted-foreground" />
             </div>
             <p className="text-2xl font-bold mt-1">1,234</p>
             <div className="flex items-center gap-1 mt-2 text-warning text-sm">
               <ArrowDown className="h-4 w-4" />
               <span>-3.2%</span>
             </div>
           </div>
 
           <div className="kpi-card danger">
             <div className="flex items-center justify-between">
               <span className="text-sm text-muted-foreground">CAC</span>
               <Users className="h-4 w-4 text-muted-foreground" />
             </div>
             <p className="text-2xl font-bold mt-1">{formatCurrency(150000)}</p>
             <div className="flex items-center gap-1 mt-2 text-destructive text-sm">
               <ArrowUp className="h-4 w-4" />
               <span>+25%</span>
             </div>
           </div>
 
           <div className="kpi-card">
             <div className="flex items-center justify-between">
               <span className="text-sm text-muted-foreground">Growth Rate</span>
               <TrendingUp className="h-4 w-4 text-muted-foreground" />
             </div>
             <p className="text-2xl font-bold mt-1">{formatPercent(18.5)}</p>
             <div className="flex items-center gap-1 mt-2 text-muted-foreground text-sm">
               <span>On track</span>
             </div>
           </div>
         </div>
       </section>
 
       {/* Data Table */}
       <section className="space-y-4">
         <h3 className="text-lg font-semibold">Data Table</h3>
         <div className="border border-border rounded-lg overflow-hidden">
           <table className="data-table">
             <thead>
               <tr>
                 <th>SKU</th>
                 <th>Product</th>
                 <th className="text-right">Revenue</th>
                 <th className="text-right">Margin</th>
                 <th>Status</th>
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td className="font-mono text-sm">SKU-001</td>
                 <td>Sản phẩm A</td>
                 <td className="text-right font-medium">{formatCurrency(125000000)}</td>
                 <td className="text-right text-success">{formatPercent(32)}</td>
                 <td><span className="status-badge success">Active</span></td>
               </tr>
               <tr>
                 <td className="font-mono text-sm">SKU-002</td>
                 <td>Sản phẩm B</td>
                 <td className="text-right font-medium">{formatCurrency(89000000)}</td>
                 <td className="text-right text-warning">{formatPercent(15)}</td>
                 <td><span className="status-badge warning">Review</span></td>
               </tr>
               <tr>
                 <td className="font-mono text-sm">SKU-003</td>
                 <td>Sản phẩm C</td>
                 <td className="text-right font-medium">{formatCurrency(45000000)}</td>
                 <td className="text-right text-destructive">{formatPercent(-5)}</td>
                 <td><span className="status-badge danger">Stop</span></td>
               </tr>
             </tbody>
           </table>
         </div>
       </section>
 
       {/* Cards */}
       <section className="space-y-4">
         <h3 className="text-lg font-semibold">Cards</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Card>
             <CardHeader>
               <CardTitle>Standard Card</CardTitle>
               <CardDescription>Card với header và description tiêu chuẩn.</CardDescription>
             </CardHeader>
             <CardContent>
               <p className="text-sm text-muted-foreground">
                 Đây là nội dung chính của card. Có thể chứa bất kỳ thông tin nào.
               </p>
             </CardContent>
           </Card>
 
           <div className="data-card-interactive">
             <h4 className="font-semibold mb-2">Interactive Data Card</h4>
             <p className="text-sm text-muted-foreground mb-4">
               Card này có hover effect và cursor pointer.
             </p>
             <div className="flex justify-between items-center">
               <span className="text-2xl font-bold">{formatCurrency(1500000000)}</span>
               <span className="status-badge success">+15%</span>
             </div>
           </div>
         </div>
       </section>
     </div>
   );
 }