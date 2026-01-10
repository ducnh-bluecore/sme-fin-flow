import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Moon,
  Sun,
  Globe,
  Shield,
  Smartphone,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  User,
  Building
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useTenantContext } from '@/contexts/TenantContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SettingItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}

function SettingItem({ icon: Icon, label, description, onClick, trailing }: SettingItemProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 text-left"
    >
      <div className="p-2 rounded-xl bg-slate-700/50">
        <Icon className="h-5 w-5 text-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      {trailing || <ChevronRight className="h-5 w-5 text-slate-500" />}
    </motion.button>
  );
}

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { activeTenant } = useTenantContext();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <>
      <Helmet>
        <title>Cài đặt | Mobile App</title>
      </Helmet>

      <div className="p-4 space-y-6">
        {/* Profile Section */}
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xl font-bold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-slate-100 truncate">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-sm text-slate-400 truncate">{user?.email}</p>
              {activeTenant && (
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <Building className="h-3 w-3" />
                  {activeTenant.name}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            Thông báo
          </h3>
          <SettingItem
            icon={Bell}
            label="Push Notifications"
            description="Nhận thông báo đẩy trên thiết bị"
            trailing={
              <Switch 
                checked={pushEnabled}
                onCheckedChange={setPushEnabled}
              />
            }
          />
          <SettingItem
            icon={Smartphone}
            label="Cấu hình thông báo"
            description="Tùy chỉnh loại thông báo nhận được"
          />
        </div>

        {/* Appearance */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            Giao diện
          </h3>
          <SettingItem
            icon={darkMode ? Moon : Sun}
            label="Chế độ tối"
            description="Sử dụng giao diện tối"
            trailing={
              <Switch 
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            }
          />
          <SettingItem
            icon={Globe}
            label="Ngôn ngữ"
            description="Tiếng Việt"
          />
        </div>

        {/* Security */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            Bảo mật
          </h3>
          <SettingItem
            icon={Shield}
            label="Bảo mật tài khoản"
            description="Mật khẩu, xác thực 2 bước"
          />
        </div>

        {/* Support */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            Hỗ trợ
          </h3>
          <SettingItem
            icon={HelpCircle}
            label="Trợ giúp"
            description="Hướng dẫn sử dụng"
          />
          <SettingItem
            icon={Info}
            label="Về ứng dụng"
            description="Version 1.0.0"
          />
        </div>

        {/* Sign Out */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 rounded-xl border border-red-500/30 text-red-400"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium">Đăng xuất</span>
        </motion.button>
      </div>
    </>
  );
}
