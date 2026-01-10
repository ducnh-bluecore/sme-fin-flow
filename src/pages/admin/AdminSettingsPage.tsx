import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Globe, Mail, Shield, Database } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminSettingsPage() {
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{t('admin.settings.title')} | Super Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.settings.title')}</h1>
          <p className="text-muted-foreground">{t('admin.settings.subtitle')}</p>
        </div>

        <div className="grid gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t('admin.settings.general')}
              </CardTitle>
              <CardDescription>{t('admin.settings.generalDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="platform-name">{t('admin.settings.platformName')}</Label>
                <Input id="platform-name" defaultValue="Bluecore Finance" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-email">{t('admin.settings.supportEmail')}</Label>
                <Input id="support-email" type="email" defaultValue="support@bluecore.vn" />
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {t('admin.settings.emailConfig')}
              </CardTitle>
              <CardDescription>{t('admin.settings.emailConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('admin.settings.confirmEmail')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.settings.confirmEmailDesc')}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('admin.settings.newTenantNotify')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.settings.newTenantNotifyDesc')}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t('admin.settings.security')}
              </CardTitle>
              <CardDescription>{t('admin.settings.securityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('admin.settings.require2FA')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.settings.require2FADesc')}
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('admin.settings.allowSignup')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.settings.allowSignupDesc')}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Database Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                {t('admin.settings.database')}
              </CardTitle>
              <CardDescription>{t('admin.settings.databaseDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('admin.settings.autoBackup')}</Label>
                  <p className="text-sm text-muted-foreground">{t('admin.settings.autoBackupStatus')}</p>
                </div>
                <Button variant="outline" size="sm">
                  {t('admin.settings.configure')}
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('admin.settings.manualBackup')}</Label>
                  <p className="text-sm text-muted-foreground">{t('admin.settings.manualBackupDesc')}</p>
                </div>
                <Button variant="outline" size="sm">
                  {t('admin.settings.createBackup')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button>{t('admin.settings.saveChanges')}</Button>
        </div>
      </div>
    </>
  );
}
