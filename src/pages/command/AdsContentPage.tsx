import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { useAdsContent, useGenerateAdsContent, useUpdateAdsContentStatus } from '@/hooks/useAdsCommandCenter';

const PLATFORMS = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'meta', label: 'Meta / Facebook' },
  { value: 'google', label: 'Google' },
  { value: 'shopee', label: 'Shopee' },
];

const CONTENT_TYPES = [
  { value: 'image_caption', label: 'Caption hình ảnh' },
  { value: 'video_script', label: 'Kịch bản video' },
  { value: 'product_listing', label: 'Listing sản phẩm' },
];

const STATUS_MAP: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Nháp' },
  pending_review: { variant: 'outline', label: 'Chờ duyệt' },
  approved: { variant: 'default', label: 'Đã duyệt' },
  rejected: { variant: 'destructive', label: 'Từ chối' },
  scheduled: { variant: 'default', label: 'Đã lên lịch' },
  published: { variant: 'default', label: 'Đã đăng' },
};

export default function AdsContentPage() {
  const { data: contents = [], isLoading } = useAdsContent();
  const generateContent = useGenerateAdsContent();
  const updateStatus = useUpdateAdsContentStatus();
  const [platform, setPlatform] = useState('tiktok');
  const [contentType, setContentType] = useState('image_caption');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGenerate = () => {
    generateContent.mutate({ platform, content_type: contentType });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Content Studio</h1>
          <p className="text-muted-foreground">Tạo nội dung quảng cáo bằng AI</p>
        </div>
      </div>

      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tạo nội dung mới</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label>Nền tảng</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Loại nội dung</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generateContent.isPending}>
              {generateContent.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Tạo nội dung
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : contents.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Chưa có nội dung nào. Nhấn "Tạo nội dung" để bắt đầu.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {contents.map((content: any) => {
            const statusInfo = STATUS_MAP[content.status] || { variant: 'secondary' as const, label: content.status };
            const isExpanded = expandedId === content.id;

            return (
              <Card key={content.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{content.platform}</Badge>
                      <Badge variant="secondary">
                        {CONTENT_TYPES.find(t => t.value === content.content_type)?.label || content.content_type}
                      </Badge>
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {content.title && (
                    <h3 className="font-semibold">{content.title}</h3>
                  )}
                  <p className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-3'}`}>
                    {content.body}
                  </p>
                  {content.body && content.body.length > 150 && (
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : content.id)}>
                      <Eye className="h-3 w-3 mr-1" />
                      {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </Button>
                  )}
                  {content.hashtags && content.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {content.hashtags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">#{tag}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {new Date(content.created_at).toLocaleString('vi-VN')}
                    </span>
                    {content.status === 'pending_review' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateStatus.mutate({ id: content.id, status: 'approved' })}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: content.id, status: 'rejected' })}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Từ chối
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
