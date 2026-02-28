import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Download,
  Facebook,
  ExternalLink,
  Check,
  AlertCircle,
  Users,
  Target,
  Zap,
  Copy,
  FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { parseFile } from '@/lib/fileParser';

// Platform icons (using generic icons since lucide doesn't have all)
const GoogleAdsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const ShopeeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-.5 4.5c1.38 0 2.5 1.12 2.5 2.5h-5c0-1.38 1.12-2.5 2.5-2.5zm6 13c0 .55-.45 1-1 1h-9c-.55 0-1-.45-1-1v-7c0-.55.45-1 1-1h9c.55 0 1 .45 1 1v7z"/>
  </svg>
);

const LazadaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
);

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  status: 'connected' | 'not_connected';
  audienceLimit: number;
  matchRate: number;
  features: string[];
}

interface AudienceSegment {
  id: string;
  name: string;
  count: number;
  description?: string;
}

interface ExportAudienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segments: AudienceSegment[];
  rfmSegments?: AudienceSegment[];
}

export function ExportAudienceDialog({ 
  open, 
  onOpenChange,
  segments,
  rfmSegments = []
}: ExportAudienceDialogProps) {
  const [step, setStep] = useState<'select' | 'configure' | 'uploading' | 'complete'>('select');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [audienceName, setAudienceName] = useState('');
  const [audienceDescription, setAudienceDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<{platform: string; success: boolean; audienceId?: string; error?: string}[]>([]);
  const [importedCustomers, setImportedCustomers] = useState<{email?: string; phone?: string}[]>([]);
  const [importSource, setImportSource] = useState<'segments' | 'file'>('segments');

  const platforms: Platform[] = [
    {
      id: 'facebook',
      name: 'Facebook/Meta Ads',
      icon: <Facebook className="h-5 w-5" />,
      color: 'bg-blue-500',
      description: 'Custom Audiences, Lookalike Audiences',
      status: 'connected',
      audienceLimit: 10000000,
      matchRate: 65,
      features: ['Custom Audience', 'Lookalike', 'Retargeting']
    },
    {
      id: 'google',
      name: 'Google Ads',
      icon: <GoogleAdsIcon />,
      color: 'bg-red-500',
      description: 'Customer Match, Similar Audiences',
      status: 'connected',
      audienceLimit: 5000000,
      matchRate: 55,
      features: ['Customer Match', 'Similar Audiences', 'Remarketing']
    },
    {
      id: 'tiktok',
      name: 'TikTok Ads',
      icon: <TikTokIcon />,
      color: 'bg-slate-900',
      description: 'Custom Audiences, Lookalike',
      status: 'connected',
      audienceLimit: 1000000,
      matchRate: 45,
      features: ['Custom Audience', 'Lookalike', 'Engagement']
    },
    {
      id: 'shopee',
      name: 'Shopee Ads',
      icon: <ShopeeIcon />,
      color: 'bg-orange-500',
      description: 'Shop Audience Targeting',
      status: 'not_connected',
      audienceLimit: 500000,
      matchRate: 80,
      features: ['Shop Followers', 'Cart Abandonment', 'Previous Buyers']
    },
    {
      id: 'lazada',
      name: 'Lazada Ads',
      icon: <LazadaIcon />,
      color: 'bg-blue-600',
      description: 'Sponsored Discovery Targeting',
      status: 'not_connected',
      audienceLimit: 500000,
      matchRate: 75,
      features: ['Discovery Ads', 'Retargeting', 'Category Targeting']
    }
  ];

  const allSegments = [
    ...segments.map(s => ({ ...s, type: 'audience' })),
    ...rfmSegments.map(s => ({ ...s, type: 'rfm' }))
  ];

  let _totalCustSum = 0;
  for (const segId of selectedSegments) {
    const seg = allSegments.find(s => s.id === segId);
    _totalCustSum += seg?.count || 0;
  }
  const totalCustomers = _totalCustSum + importedCustomers.length;

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseFile(file);
      if (parsed.errors.length > 0) {
        toast.error(parsed.errors[0]);
        return;
      }

      // Extract email and phone from parsed data
      const customers = parsed.rows.map(row => ({
        email: row.email || row.Email || row.EMAIL || undefined,
        phone: row.phone || row.Phone || row.PHONE || row.phone_number || row.mobile || undefined
      })).filter(c => c.email || c.phone);

      setImportedCustomers(customers);
      toast.success(`Đã import ${customers.length} khách hàng từ file`);
    } catch (error) {
      toast.error('Không thể đọc file');
    }
  };

  const handleUpload = async () => {
    setStep('uploading');
    setUploadProgress(0);
    setUploadResults([]);

    // Simulate upload to each platform
    for (let i = 0; i < selectedPlatforms.length; i++) {
      const platform = platforms.find(p => p.id === selectedPlatforms[i])!;
      
      // Simulate progress
      for (let p = 0; p <= 100; p += 10) {
        await new Promise(r => setTimeout(r, 100));
        setUploadProgress(((i * 100) + p) / selectedPlatforms.length);
      }

      // Simulate result (80% success rate)
      const success = Math.random() > 0.2;
      setUploadResults(prev => [...prev, {
        platform: platform.name,
        success,
        audienceId: success ? `AUD_${Date.now()}_${platform.id}` : undefined,
        error: success ? undefined : 'API rate limit exceeded'
      }]);
    }

    setStep('complete');
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'email,phone,name\nexample@email.com,0901234567,Nguyen Van A\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSegment = (format: 'csv' | 'json') => {
    // Simulate export data
    const data = selectedSegments.map(segId => {
      const seg = allSegments.find(s => s.id === segId);
      return { segment: seg?.name, count: seg?.count };
    });

    if (format === 'csv') {
      const csv = 'segment,count\n' + data.map(d => `${d.segment},${d.count}`).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audience_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audience_export.json';
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Đã xuất file ${format.toUpperCase()}`);
  };

  const resetDialog = () => {
    setStep('select');
    setSelectedPlatforms([]);
    setSelectedSegments([]);
    setAudienceName('');
    setAudienceDescription('');
    setUploadProgress(0);
    setUploadResults([]);
    setImportedCustomers([]);
    setImportSource('segments');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetDialog(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-violet-400" />
            Import Audience lên Ads Platforms
          </DialogTitle>
          <DialogDescription>
            Đẩy danh sách khách hàng lên các nền tảng quảng cáo để tối ưu targeting
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6 py-4">
            {/* Source Selection */}
            <div className="space-y-3">
              <Label>Nguồn dữ liệu khách hàng</Label>
              <div className="flex gap-3">
                <Button
                  variant={importSource === 'segments' ? 'default' : 'outline'}
                  onClick={() => setImportSource('segments')}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Từ Segments
                </Button>
                <Button
                  variant={importSource === 'file' ? 'default' : 'outline'}
                  onClick={() => setImportSource('file')}
                  className="flex-1"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Import File
                </Button>
              </div>
            </div>

            {importSource === 'segments' ? (
              /* Segment Selection */
              <div className="space-y-3">
                <Label>Chọn segments để upload</Label>
                <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {allSegments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Chưa có segments. Cần thêm dữ liệu khách hàng.
                    </p>
                  ) : (
                    allSegments.map((segment) => (
                      <div
                        key={segment.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          selectedSegments.includes(segment.id) 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-muted/50'
                        )}
                        onClick={() => {
                          setSelectedSegments(prev => 
                            prev.includes(segment.id) 
                              ? prev.filter(id => id !== segment.id)
                              : [...prev, segment.id]
                          );
                        }}
                      >
                        <Checkbox checked={selectedSegments.includes(segment.id)} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{segment.name}</p>
                          {segment.description && (
                            <p className="text-xs text-muted-foreground">{segment.description}</p>
                          )}
                        </div>
                        <Badge variant="outline">{segment.count.toLocaleString()} users</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* File Import */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Upload file khách hàng</Label>
                  <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="h-4 w-4 mr-1" />
                    Template
                  </Button>
                </div>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={handleFileImport}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Kéo thả file hoặc click để upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hỗ trợ: CSV, Excel, JSON (cần cột email hoặc phone)
                    </p>
                  </label>
                </div>
                {importedCustomers.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm">Đã import {importedCustomers.length} khách hàng</span>
                  </div>
                )}
              </div>
            )}

            {/* Platform Selection */}
            <div className="space-y-3">
              <Label>Chọn nền tảng quảng cáo</Label>
              <div className="grid gap-3">
                {platforms.map((platform) => (
                  <div
                    key={platform.id}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all',
                      platform.status === 'not_connected' && 'opacity-60',
                      selectedPlatforms.includes(platform.id) 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => {
                      if (platform.status === 'not_connected') {
                        toast.info(`Vui lòng kết nối ${platform.name} trong Data Hub`);
                        return;
                      }
                      setSelectedPlatforms(prev => 
                        prev.includes(platform.id) 
                          ? prev.filter(id => id !== platform.id)
                          : [...prev, platform.id]
                      );
                    }}
                  >
                    <Checkbox 
                      checked={selectedPlatforms.includes(platform.id)} 
                      disabled={platform.status === 'not_connected'}
                    />
                    <div className={cn('p-2 rounded-lg text-white', platform.color)}>
                      {platform.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{platform.name}</p>
                        <Badge 
                          variant="outline" 
                          className={platform.status === 'connected' 
                            ? 'border-emerald-500 text-emerald-400' 
                            : 'border-muted-foreground text-muted-foreground'
                          }
                        >
                          {platform.status === 'connected' ? 'Connected' : 'Not Connected'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{platform.description}</p>
                      <div className="flex gap-2 mt-2">
                        {platform.features.map(f => (
                          <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Match rate</p>
                      <p className="font-semibold">{platform.matchRate}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary & Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">Tổng: </span>
                <span className="font-semibold">{totalCustomers.toLocaleString()} khách hàng</span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-semibold">{selectedPlatforms.length} platforms</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleExportSegment('csv')} disabled={selectedSegments.length === 0 && importedCustomers.length === 0}>
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
                <Button 
                  onClick={() => setStep('configure')}
                  disabled={(selectedSegments.length === 0 && importedCustomers.length === 0) || selectedPlatforms.length === 0}
                >
                  Tiếp tục
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="name">Tên Audience *</Label>
              <Input
                id="name"
                value={audienceName}
                onChange={(e) => setAudienceName(e.target.value)}
                placeholder="VD: Champions Q1 2024"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="desc">Mô tả</Label>
              <Textarea
                id="desc"
                value={audienceDescription}
                onChange={(e) => setAudienceDescription(e.target.value)}
                placeholder="Khách hàng VIP có tần suất mua cao..."
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Cấu hình nâng cao</Label>
              <div className="grid gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Checkbox id="lookalike" />
                  <label htmlFor="lookalike" className="text-sm flex-1 cursor-pointer">
                    <p className="font-medium">Tạo Lookalike Audience</p>
                    <p className="text-muted-foreground text-xs">Tự động tạo audience tương tự (1-10%)</p>
                  </label>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Checkbox id="exclude" />
                  <label htmlFor="exclude" className="text-sm flex-1 cursor-pointer">
                    <p className="font-medium">Tạo Exclusion Audience</p>
                    <p className="text-muted-foreground text-xs">Loại trừ nhóm này khỏi các campaign khác</p>
                  </label>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Checkbox id="sync" defaultChecked />
                  <label htmlFor="sync" className="text-sm flex-1 cursor-pointer">
                    <p className="font-medium">Auto-sync hàng ngày</p>
                    <p className="text-muted-foreground text-xs">Tự động cập nhật audience khi có thay đổi</p>
                  </label>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="font-medium text-sm">Preview</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Segments</p>
                  <p>{selectedSegments.length} nhóm ({totalCustomers.toLocaleString()} users)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Platforms</p>
                  <p>{selectedPlatforms.map(id => platforms.find(p => p.id === id)?.name).join(', ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. Matched Users</p>
                  <p className="text-emerald-400">~{Math.round(totalCustomers * 0.6).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ready for</p>
                  <p>Custom Audiences, Retargeting</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="ghost" onClick={() => setStep('select')}>
                Quay lại
              </Button>
              <Button onClick={handleUpload} disabled={!audienceName}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Audience
              </Button>
            </div>
          </div>
        )}

        {step === 'uploading' && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                <Upload className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold">Đang upload audience...</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Đang đẩy {totalCustomers.toLocaleString()} khách hàng lên {selectedPlatforms.length} platforms
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>

            {uploadResults.length > 0 && (
              <div className="space-y-2">
                {uploadResults.map((result, i) => (
                  <div key={i} className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    result.success ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  )}>
                    {result.success 
                      ? <Check className="h-4 w-4 text-emerald-400" />
                      : <AlertCircle className="h-4 w-4 text-red-400" />
                    }
                    <span className="flex-1">{result.platform}</span>
                    {result.success && (
                      <code className="text-xs bg-muted px-2 py-1 rounded">{result.audienceId}</code>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'complete' && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold">Upload hoàn tất!</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Audience "{audienceName}" đã được tạo trên các platforms
              </p>
            </div>

            <div className="space-y-2">
              {uploadResults.map((result, i) => (
                <div key={i} className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border',
                  result.success ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'
                )}>
                  {result.success 
                    ? <Check className="h-5 w-5 text-emerald-400" />
                    : <AlertCircle className="h-5 w-5 text-red-400" />
                  }
                  <div className="flex-1">
                    <p className="font-medium">{result.platform}</p>
                    {result.success ? (
                      <p className="text-xs text-muted-foreground">ID: {result.audienceId}</p>
                    ) : (
                      <p className="text-xs text-red-400">{result.error}</p>
                    )}
                  </div>
                  {result.success && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText(result.audienceId || '');
                        toast.success('Đã copy Audience ID');
                      }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-blue-500/10 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Bước tiếp theo</p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• Vào Ads Manager của từng platform để tạo campaign</li>
                    <li>• Sử dụng Audience ID để target hoặc exclude</li>
                    <li>• Tạo Lookalike để mở rộng tệp khách hàng tiềm năng</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
              <Button onClick={resetDialog}>
                <Zap className="h-4 w-4 mr-2" />
                Upload Audience khác
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
