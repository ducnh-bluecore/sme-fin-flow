import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Globe, Mail, Shield, Database } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/shared/PageHeader';

// Setting Section Component
function SettingSection({
  icon: Icon,
  title,
  description,
  children,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            {title}
          </CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

// Toggle Setting Row
function ToggleSetting({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

// Button Setting Row
function ButtonSetting({
  label,
  description,
  buttonText,
  onClick,
}: {
  label: string;
  description: string;
  buttonText: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onClick}>
        {buttonText}
      </Button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{t('admin.settings.title')} | Super Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title={t('admin.settings.title')}
          subtitle={t('admin.settings.subtitle')}
          icon={<Settings className="w-5 h-5" />}
          actions={
            <Button>{t('admin.settings.saveChanges')}</Button>
          }
        />

        <div className="grid gap-6 max-w-4xl">
          {/* General Settings */}
          <SettingSection
            icon={Globe}
            title={t('admin.settings.general')}
            description={t('admin.settings.generalDesc')}
            delay={0}
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="platform-name">{t('admin.settings.platformName')}</Label>
                <Input id="platform-name" defaultValue="Bluecore Finance" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-email">{t('admin.settings.supportEmail')}</Label>
                <Input id="support-email" type="email" defaultValue="support@bluecore.vn" />
              </div>
            </div>
          </SettingSection>

          {/* Email Settings */}
          <SettingSection
            icon={Mail}
            title={t('admin.settings.emailConfig')}
            description={t('admin.settings.emailConfigDesc')}
            delay={0.1}
          >
            <ToggleSetting
              label={t('admin.settings.confirmEmail')}
              description={t('admin.settings.confirmEmailDesc')}
              defaultChecked={true}
            />
            <Separator />
            <ToggleSetting
              label={t('admin.settings.newTenantNotify')}
              description={t('admin.settings.newTenantNotifyDesc')}
              defaultChecked={true}
            />
          </SettingSection>

          {/* Security Settings */}
          <SettingSection
            icon={Shield}
            title={t('admin.settings.security')}
            description={t('admin.settings.securityDesc')}
            delay={0.2}
          >
            <ToggleSetting
              label={t('admin.settings.require2FA')}
              description={t('admin.settings.require2FADesc')}
            />
            <Separator />
            <ToggleSetting
              label={t('admin.settings.allowSignup')}
              description={t('admin.settings.allowSignupDesc')}
              defaultChecked={true}
            />
          </SettingSection>

          {/* Database Settings */}
          <SettingSection
            icon={Database}
            title={t('admin.settings.database')}
            description={t('admin.settings.databaseDesc')}
            delay={0.3}
          >
            <ButtonSetting
              label={t('admin.settings.autoBackup')}
              description={t('admin.settings.autoBackupStatus')}
              buttonText={t('admin.settings.configure')}
            />
            <Separator />
            <ButtonSetting
              label={t('admin.settings.manualBackup')}
              description={t('admin.settings.manualBackupDesc')}
              buttonText={t('admin.settings.createBackup')}
            />
          </SettingSection>
        </div>
      </div>
    </>
  );
}
