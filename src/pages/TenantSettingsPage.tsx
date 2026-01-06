import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Settings,
  Building2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTenantContext } from '@/contexts/TenantContext';
import { useUpdateTenant } from '@/hooks/useTenant';

export default function TenantSettingsPage() {
  const { activeTenant, isOwner, isLoading: tenantLoading } = useTenantContext();
  const updateTenant = useUpdateTenant();
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (activeTenant) {
      setName(activeTenant.name);
      setLogoUrl(activeTenant.logo_url || '');
    }
  }, [activeTenant]);

  const handleSave = () => {
    if (!activeTenant) return;
    updateTenant.mutate({
      tenantId: activeTenant.id,
      data: { name, logo_url: logoUrl || null },
    });
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Chưa có công ty nào được chọn</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Cài đặt công ty | {activeTenant.name}</title>
        <meta name="description" content="Cài đặt thông tin công ty" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/tenant">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Cài đặt công ty
            </h1>
            <p className="text-muted-foreground">
              Cập nhật thông tin cơ bản của {activeTenant.name}
            </p>
          </div>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin công ty</CardTitle>
              <CardDescription>
                Cập nhật thông tin cơ bản của công ty
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={logoUrl || undefined} />
                  <AvatarFallback className="text-2xl">
                    {name?.charAt(0) || 'T'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="logo">URL Logo</Label>
                  <Input
                    id="logo"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Tên công ty</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isOwner}
                />
              </div>

              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={activeTenant.slug} disabled />
                <p className="text-xs text-muted-foreground">
                  Slug không thể thay đổi sau khi tạo
                </p>
              </div>

              <div className="space-y-2">
                <Label>Gói dịch vụ</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {activeTenant.plan || 'free'}
                  </Badge>
                  <Button variant="link" size="sm" className="text-primary">
                    Nâng cấp
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ngày tạo</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(activeTenant.created_at).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {isOwner && (
                <Button
                  onClick={handleSave}
                  disabled={updateTenant.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateTenant.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Lưu thay đổi
                </Button>
              )}

              {!isOwner && (
                <p className="text-sm text-muted-foreground">
                  Chỉ chủ sở hữu mới có thể chỉnh sửa thông tin công ty
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </>
  );
}
