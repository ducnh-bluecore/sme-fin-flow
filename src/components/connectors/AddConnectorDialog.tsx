import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Building2, 
  Landmark, 
  ArrowLeft,
  ExternalLink,
  Key,
  Store,
  Truck,
  Megaphone,
  MessageSquare,
  Mail,
  Database,
  BarChart3,
} from 'lucide-react';
import { useConnectorIntegrations, CreateIntegrationParams } from '@/hooks/useConnectorIntegrations';
import { Database as DatabaseType } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type ConnectorType = DatabaseType['public']['Enums']['connector_type'];

interface ConnectorConfig {
  type: ConnectorType | string;
  name: string;
  logo: string;
  category: 'ecommerce' | 'marketplace' | 'erp' | 'logistics' | 'accounting' | 'ads' | 'messaging' | 'analytics' | 'data';
  fields: { key: string; label: string; type: 'text' | 'password'; placeholder: string; required?: boolean }[];
  docUrl?: string;
  comingSoon?: boolean;
}

const CONNECTORS: ConnectorConfig[] = [
  // E-commerce / Website platforms
  {
    type: 'haravan',
    name: 'Haravan',
    logo: 'https://product.hstatic.net/200000404175/product/untitled_43484473aada4f7193372faf3d883ce9_grande.png',
    category: 'ecommerce',
    fields: [
      { key: 'shop_name', label: 'Tên shop', type: 'text', placeholder: 'myshop', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Nhập API Key', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Nhập API Secret', required: true },
    ],
    docUrl: 'https://docs.haravan.com/',
  },
  {
    type: 'sapo',
    name: 'Sapo',
    logo: 'https://product.hstatic.net/200000404175/product/sapo_8d53d05ddf3947f8a9e0b038326cc236_grande.jpg',
    category: 'ecommerce',
    fields: [
      { key: 'shop_name', label: 'Tên shop', type: 'text', placeholder: 'myshop', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Nhập API Key', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Nhập API Secret', required: true },
    ],
    docUrl: 'https://developers.sapo.vn/',
  },
  {
    type: 'woocommerce',
    name: 'WooCommerce',
    logo: 'https://woocommerce.com/wp-content/themes/flavor/assets/images/woo_logo.svg',
    category: 'ecommerce',
    fields: [
      { key: 'store_url', label: 'Store URL', type: 'text', placeholder: 'https://mystore.com', required: true },
      { key: 'consumer_key', label: 'Consumer Key', type: 'text', placeholder: 'Consumer Key', required: true },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password', placeholder: 'Consumer Secret', required: true },
    ],
    docUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
    comingSoon: true,
  },
  {
    type: 'shopify',
    name: 'Shopify',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__4__9c384815fab24a4ab893503cad6485e6_grande.png',
    category: 'ecommerce',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'nhanh',
    name: 'Nhanh.vn',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__6__96ba679ef3b84f17a1037a094d61b00e_grande.png',
    category: 'ecommerce',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'pancake',
    name: 'Pancake',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__7__fb5aa91df0f944c0acc9c022be6deff9_grande.png',
    category: 'ecommerce',
    fields: [],
    comingSoon: true,
  },

  // Marketplace
  {
    type: 'shopee',
    name: 'Shopee',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__12__4e2b3a1ee80b4cd1ba53f54af5137d8b_grande.png',
    category: 'marketplace',
    fields: [
      { key: 'shop_id', label: 'Shop ID', type: 'text', placeholder: 'Shop ID từ Shopee', required: true },
      { key: 'partner_id', label: 'Partner ID', type: 'text', placeholder: 'Partner ID', required: true },
      { key: 'partner_key', label: 'Partner Key', type: 'password', placeholder: 'Partner Key', required: true },
    ],
    docUrl: 'https://open.shopee.com/documents',
  },
  {
    type: 'lazada',
    name: 'Lazada',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__11__d2b76efb45e64984a84aa834388130ba_grande.png',
    category: 'marketplace',
    fields: [
      { key: 'seller_id', label: 'Seller ID', type: 'text', placeholder: 'Seller ID', required: true },
      { key: 'app_key', label: 'App Key', type: 'text', placeholder: 'App Key', required: true },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: 'App Secret', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Access Token', required: true },
    ],
    docUrl: 'https://open.lazada.com/doc/doc.htm',
  },
  {
    type: 'tiktok_shop',
    name: 'TikTok Shop',
    logo: 'https://product.hstatic.net/200000404175/product/tiktokshop_c892dcc83f354ebc9f84ba3e12691f1b_grande.png',
    category: 'marketplace',
    fields: [
      { key: 'shop_id', label: 'Shop ID', type: 'text', placeholder: 'TikTok Shop ID', required: true },
      { key: 'app_key', label: 'App Key', type: 'text', placeholder: 'App Key', required: true },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: 'App Secret', required: true },
    ],
    docUrl: 'https://partner.tiktokshop.com/doc',
  },
  {
    type: 'tiki',
    name: 'Tiki',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__10__50464673a3f24925b8766b4454cae1e4_grande.png',
    category: 'marketplace',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'sendo',
    name: 'Sendo',
    logo: 'https://salt.tikicdn.com/cache/280x280/ts/product/34/8e/82/e7fc08bc7e92e0bfbb6e9c62fbdfc96f.jpg',
    category: 'marketplace',
    fields: [],
    comingSoon: true,
  },

  // Ads / Marketing
  {
    type: 'facebook_ads',
    name: 'Facebook Ads',
    logo: 'https://product.hstatic.net/200000404175/product/layer_1_46040099e81d49c59bb8b0c1a68303ba_grande.png',
    category: 'ads',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'tiktok_ads',
    name: 'TikTok Ads',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__5__5dc927b5aa5b4f2c826595bae7a54a19_grande.png',
    category: 'ads',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'meta_graph',
    name: 'Meta Graph',
    logo: 'https://product.hstatic.net/200000404175/product/metagraph_8191b2456bfa442992c416d99fa13c71_grande.png',
    category: 'ads',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'linkedin_ads',
    name: 'LinkedIn Ads',
    logo: 'https://product.hstatic.net/200000404175/product/linkedin_e2a29925a9424a6198a6556211800df2_grande.png',
    category: 'ads',
    fields: [],
    comingSoon: true,
  },

  // Analytics
  {
    type: 'google_analytics',
    name: 'Google Analytics',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__8__0816568c8e224a969872ed3af84f3bc9_grande.png',
    category: 'analytics',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'youtube_analytics',
    name: 'YouTube Analytics',
    logo: 'https://product.hstatic.net/200000404175/product/youtube_5d2e3c61fc9848739927c972dfaa5acb_grande.png',
    category: 'analytics',
    fields: [],
    comingSoon: true,
  },

  // Messaging / Communication
  {
    type: 'zalo_zns',
    name: 'Zalo ZNS',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__16__017742eb01ca43a1ac6d0a2de6549e39_grande.png',
    category: 'messaging',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'zalo_oa',
    name: 'Zalo OA',
    logo: 'https://product.hstatic.net/200000404175/product/untitled_d81cfff9b6f44fad8f54a0980c8aec64_grande.png',
    category: 'messaging',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'esms',
    name: 'eSMS',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__13__a40f0a820f8844329208481bb9a99157_grande.png',
    category: 'messaging',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'vmg_sms',
    name: 'VMG SMS',
    logo: 'https://product.hstatic.net/200000404175/product/vmgsms_3a8fee0de79d46c3951e43b125d95264_grande.png',
    category: 'messaging',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'vietguys',
    name: 'Vietguys',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__14__7a3bbc0d92f441aca39785b7d9ed6ea5_grande.png',
    category: 'messaging',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'gmail',
    name: 'Gmail',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__15__657c1f7ed66844748c9bd28e5fde4807_grande.png',
    category: 'messaging',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'mailchimp',
    name: 'Mailchimp',
    logo: 'https://product.hstatic.net/200000404175/product/mailchimp_ff6504135b6446cd8bb8f8cb618f743c_grande.png',
    category: 'messaging',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'brevo',
    name: 'Brevo (SendinBlue)',
    logo: 'https://product.hstatic.net/200000404175/product/sendinblue_9ef8ead6d90347f4a0ea8fb9cbbcc1c3_grande.png',
    category: 'messaging',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'onesignal',
    name: 'OneSignal Web Push',
    logo: 'https://product.hstatic.net/200000404175/product/onesignalwebpush_53c16d8df78d47e7bb8ce13479d3ac06_grande.png',
    category: 'messaging',
    fields: [],
    comingSoon: true,
  },

  // ERP/POS
  {
    type: 'kiotviet',
    name: 'KiotViet',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__2__8e2ebfb7400a49c0ba43b0b9a0806556_grande.png',
    category: 'erp',
    fields: [
      { key: 'retailer', label: 'Retailer Code', type: 'text', placeholder: 'Mã retailer', required: true },
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Client ID', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Client Secret', required: true },
    ],
    docUrl: 'https://www.kiotviet.vn/api-document/',
  },
  {
    type: 'base_vn',
    name: 'Base.vn',
    logo: 'https://product.hstatic.net/200000404175/product/basevn_beefdb38a4db44d5957179a217c311a1_grande.png',
    category: 'erp',
    fields: [],
    comingSoon: true,
  },

  // Accounting
  {
    type: 'misa_cukcuk',
    name: 'MISA CukCuk',
    logo: 'https://product.hstatic.net/200000404175/product/misacukcuk_46acd2fc9e3e418496d6b7f49e243b2a_grande.png',
    category: 'accounting',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'misa',
    name: 'MISA AMIS',
    logo: 'https://amis.misa.vn/Content/images/logo_misa.png',
    category: 'accounting',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'fast',
    name: 'FAST Accounting',
    logo: 'https://fast.com.vn/wp-content/uploads/2020/06/logo-fast-1.png',
    category: 'accounting',
    fields: [],
    comingSoon: true,
  },

  // Logistics
  {
    type: 'ghtk',
    name: 'GHTK',
    logo: 'https://ghtk.vn/static/img/logo.png',
    category: 'logistics',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'ghn',
    name: 'GHN',
    logo: 'https://ghn.vn/static/v4.0/img/logo-ghn.svg',
    category: 'logistics',
    fields: [],
    comingSoon: true,
  },

  // Data Sources
  {
    type: 'google_sheets',
    name: 'Google Sheets',
    logo: 'https://product.hstatic.net/200000404175/product/untitled__9__8a82de6ed41f48d78453fcf591253713_grande.png',
    category: 'data',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'mysql',
    name: 'MySQL',
    logo: 'https://product.hstatic.net/200000404175/product/mysqldb_215395621d074a2e99bc6cba88aad35d_grande.png',
    category: 'data',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'csv',
    name: 'CSV File',
    logo: 'https://product.hstatic.net/200000404175/product/csvfile_a00d8f0bb23d4461b2f0ceaa5c966497_grande.png',
    category: 'data',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'excel',
    name: 'Excel File',
    logo: 'https://product.hstatic.net/200000404175/product/sharedexcelfile_361333a3611441b09ac64f636bdc02fb_grande.png',
    category: 'data',
    fields: [],
    comingSoon: true,
  },
  {
    type: 'microsoft',
    name: 'Microsoft Account',
    logo: 'https://product.hstatic.net/200000404175/product/microsoftaccount_e7cc923457534f25b34d61ad0351a7f5_grande.png',
    category: 'data',
    fields: [],
    comingSoon: true,
  },
];

const CATEGORIES = [
  { id: 'ecommerce', label: 'Website', icon: Store },
  { id: 'marketplace', label: 'Sàn TMĐT', icon: ShoppingCart },
  { id: 'ads', label: 'Quảng cáo', icon: Megaphone },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'messaging', label: 'Tin nhắn', icon: MessageSquare },
  { id: 'erp', label: 'ERP/POS', icon: Building2 },
  { id: 'accounting', label: 'Kế toán', icon: Landmark },
  { id: 'logistics', label: 'Vận chuyển', icon: Truck },
  { id: 'data', label: 'Nguồn dữ liệu', icon: Database },
];

interface AddConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedType?: ConnectorType;
}

export function AddConnectorDialog({ open, onOpenChange, preselectedType }: AddConnectorDialogProps) {
  const [step, setStep] = useState<'select' | 'configure'>(preselectedType ? 'configure' : 'select');
  const [selectedConnector, setSelectedConnector] = useState<ConnectorConfig | null>(
    preselectedType ? CONNECTORS.find(c => c.type === preselectedType) || null : null
  );
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string>('ecommerce');

  const { createIntegration } = useConnectorIntegrations();

  const handleSelectConnector = (connector: ConnectorConfig) => {
    setSelectedConnector(connector);
    setFormData({});
    setStep('configure');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedConnector(null);
    setFormData({});
  };

  const handleSubmit = () => {
    if (!selectedConnector) return;

    const shopName = formData.shop_name || formData.store_url || formData.retailer || `${selectedConnector.name} Store`;
    const shopId = formData.shop_id || formData.seller_id || formData.retailer;

    // Extract credentials (non-shop fields)
    const credentials: Record<string, string> = {};
    selectedConnector.fields.forEach(field => {
      if (!['shop_name', 'shop_id', 'seller_id', 'retailer', 'store_url'].includes(field.key) && formData[field.key]) {
        credentials[field.key] = formData[field.key];
      }
    });

    const params: CreateIntegrationParams = {
      connector_type: selectedConnector.type as ConnectorType,
      connector_name: selectedConnector.name,
      shop_name: shopName,
      shop_id: shopId,
      credentials: credentials as unknown as CreateIntegrationParams['credentials'],
    };

    createIntegration.mutate(params, {
      onSuccess: () => {
        onOpenChange(false);
        setStep('select');
        setSelectedConnector(null);
        setFormData({});
      },
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep('select');
    setSelectedConnector(null);
    setFormData({});
  };

  const isFormValid = () => {
    if (!selectedConnector) return false;
    return selectedConnector.fields
      .filter(f => f.required)
      .every(f => formData[f.key]?.trim());
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'configure' && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 mr-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {step === 'select' ? 'Thêm kết nối mới' : `Cấu hình ${selectedConnector?.name}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' 
              ? 'Chọn nền tảng bạn muốn kết nối để đồng bộ dữ liệu'
              : 'Nhập thông tin xác thực để kết nối với nền tảng'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <AnimatePresence mode="wait">
            {step === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    {CATEGORIES.map(cat => (
                      <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5 text-xs px-2 py-1.5">
                        <cat.icon className="w-3.5 h-3.5" />
                        {cat.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {CATEGORIES.map(cat => (
                    <TabsContent key={cat.id} value={cat.id}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CONNECTORS.filter(c => c.category === cat.id).map(connector => (
                          <button
                            key={connector.type}
                            onClick={() => !connector.comingSoon && handleSelectConnector(connector)}
                            disabled={connector.comingSoon}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border border-border relative",
                              connector.comingSoon 
                                ? "opacity-60 cursor-not-allowed bg-muted/30"
                                : "hover:border-primary hover:bg-primary/5 transition-all",
                              "text-left"
                            )}
                          >
                            {connector.comingSoon && (
                              <Badge 
                                variant="secondary" 
                                className="absolute top-1.5 right-1.5 text-[9px] px-1 py-0"
                              >
                                Soon
                              </Badge>
                            )}
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center p-1.5 flex-shrink-0">
                              <img 
                                src={connector.logo} 
                                alt={connector.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg';
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{connector.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {connector.comingSoon 
                                  ? 'Sắp ra mắt' 
                                  : `${connector.fields.length} trường`
                                }
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </motion.div>
            )}

            {step === 'configure' && selectedConnector && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Connector Info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                  <div className="w-16 h-16 rounded-lg bg-background flex items-center justify-center p-2">
                    <img 
                      src={selectedConnector.logo} 
                      alt={selectedConnector.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{selectedConnector.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Nhập thông tin API để kết nối
                    </p>
                  </div>
                  {selectedConnector.docUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedConnector.docUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Tài liệu API
                      </a>
                    </Button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {selectedConnector.fields.map(field => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} className="flex items-center gap-2">
                        {field.type === 'password' ? (
                          <Key className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Store className="w-4 h-4 text-muted-foreground" />
                        )}
                        {field.label}
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id={field.key}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>

                {/* Info Note */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                  <p className="text-muted-foreground">
                    💡 Thông tin xác thực được mã hóa và lưu trữ an toàn. 
                    Sau khi kết nối, hệ thống sẽ tự động đồng bộ dữ liệu hàng ngày.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step === 'configure' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleBack}>
              Quay lại
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!isFormValid() || createIntegration.isPending}
            >
              {createIntegration.isPending ? 'Đang kết nối...' : 'Kết nối ngay'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
