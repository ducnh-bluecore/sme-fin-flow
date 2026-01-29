/**
 * Sales Deck Downloader Component
 * 
 * Provides UI for downloading PDF sales decks for different modules
 */

import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileDown, Loader2, FileText, Building2, TrendingUp, Users, AlertTriangle, Database, Layers } from 'lucide-react';
import FDPSalesDeckPDF from './FDPSalesDeckPDF';
import MDPSalesDeckPDF from './MDPSalesDeckPDF';
import CDPSalesDeckPDF from './CDPSalesDeckPDF';
import ControlTowerSalesDeckPDF from './ControlTowerSalesDeckPDF';
import DataWarehouseSalesDeckPDF from './DataWarehouseSalesDeckPDF';
import FullSystemSalesDeckPDF from './FullSystemSalesDeckPDF';

interface DeckOption {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  available: boolean;
  tagline: string;
  component?: React.ReactElement;
  featured?: boolean;
}

const deckOptions: DeckOption[] = [
  {
    id: 'full-system',
    title: 'Full System Overview',
    subtitle: 'Sales Deck tổng quan toàn bộ Bluecore (16 trang)',
    icon: <Layers className="h-6 w-6 text-indigo-600" />,
    available: true,
    tagline: 'Decision-First Platform',
    component: <FullSystemSalesDeckPDF />,
    featured: true,
  },
  {
    id: 'fdp',
    title: 'FDP - Financial Data Platform',
    subtitle: 'Sales Deck cho hệ thống Tài chính',
    icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
    available: true,
    tagline: 'Truth > Flexibility',
    component: <FDPSalesDeckPDF />,
  },
  {
    id: 'mdp',
    title: 'MDP - Marketing Data Platform',
    subtitle: 'Sales Deck cho hệ thống Marketing',
    icon: <Building2 className="h-6 w-6 text-purple-600" />,
    available: true,
    tagline: 'Profit before Performance',
    component: <MDPSalesDeckPDF />,
  },
  {
    id: 'cdp',
    title: 'CDP - Customer Data Platform',
    subtitle: 'Sales Deck cho hệ thống Khách hàng',
    icon: <Users className="h-6 w-6 text-green-600" />,
    available: true,
    tagline: 'Population > Individual',
    component: <CDPSalesDeckPDF />,
  },
  {
    id: 'control-tower',
    title: 'Control Tower',
    subtitle: 'Sales Deck cho Trung tâm điều hành',
    icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
    available: true,
    tagline: 'Awareness before Analytics',
    component: <ControlTowerSalesDeckPDF />,
  },
  {
    id: 'datawarehouse',
    title: 'Data Warehouse',
    subtitle: 'Sales Deck cho kiến trúc Data',
    icon: <Database className="h-6 w-6 text-cyan-600" />,
    available: true,
    tagline: 'Single Source of Truth',
    component: <DataWarehouseSalesDeckPDF />,
  },
];

const SalesDeckDownloader: React.FC = () => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Sales Deck Library</h2>
        <p className="text-muted-foreground">
          Tải về tài liệu Sales Deck cho từng module của hệ thống Bluecore
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deckOptions.map((deck) => (
          <Card key={deck.id} className={`relative ${!deck.available ? 'opacity-60' : ''} ${deck.featured ? 'ring-2 ring-primary bg-primary/10' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${deck.featured ? 'bg-primary/20' : 'bg-muted'}`}>{deck.icon}</div>
                {deck.featured ? (
                  <Badge variant="default" className="bg-primary text-primary-foreground">
                    Đề xuất
                  </Badge>
                ) : deck.available ? (
                  <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Sẵn sàng
                  </Badge>
                ) : (
                  <Badge variant="secondary">Đang phát triển</Badge>
                )}
              </div>
              <CardTitle className="text-lg mt-3 text-foreground">{deck.title}</CardTitle>
              <CardDescription className="text-muted-foreground">{deck.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground italic">"{deck.tagline}"</span>
                
                {deck.available && deck.component ? (
                  <PDFDownloadLink
                    document={deck.component}
                    fileName={`Bluecore_${deck.id.toUpperCase()}_SalesDeck.pdf`}
                  >
                    {({ loading }) => (
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => loading && setLoadingId(deck.id)}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang tạo...
                          </>
                        ) : (
                          <>
                            <FileDown className="mr-2 h-4 w-4" />
                            Tải PDF
                          </>
                        )}
                      </Button>
                    )}
                  </PDFDownloadLink>
                ) : (
                  <Button size="sm" disabled variant="secondary">
                    <FileDown className="mr-2 h-4 w-4" />
                    Sắp có
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>
          Các Sales Deck được tạo tự động từ nội dung hệ thống. 
          Liên hệ team để yêu cầu customization.
        </p>
      </div>
    </div>
  );
};

export default SalesDeckDownloader;
