/**
 * Sales Deck Downloader Component
 * 
 * Provides UI for downloading PDF sales decks for different modules
 * Supports both Vietnamese and English versions
 */

import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Loader2, Building2, TrendingUp, Users, AlertTriangle, Database, Layers, Globe } from 'lucide-react';

// Vietnamese versions
import FDPSalesDeckPDF from './FDPSalesDeckPDF';
import MDPSalesDeckPDF from './MDPSalesDeckPDF';
import CDPSalesDeckPDF from './CDPSalesDeckPDF';
import ControlTowerSalesDeckPDF from './ControlTowerSalesDeckPDF';
import DataWarehouseSalesDeckPDF from './DataWarehouseSalesDeckPDF';
import FullSystemSalesDeckPDF from './FullSystemSalesDeckPDF';

// English versions
import FDPSalesDeckPDF_EN from './FDPSalesDeckPDF_EN';
import MDPSalesDeckPDF_EN from './MDPSalesDeckPDF_EN';
import CDPSalesDeckPDF_EN from './CDPSalesDeckPDF_EN';
import ControlTowerSalesDeckPDF_EN from './ControlTowerSalesDeckPDF_EN';
import DataWarehouseSalesDeckPDF_EN from './DataWarehouseSalesDeckPDF_EN';
import FullSystemSalesDeckPDF_EN from './FullSystemSalesDeckPDF_EN';

interface DeckOption {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  available: boolean;
  tagline: string;
  componentVI?: React.ReactElement;
  componentEN?: React.ReactElement;
  featured?: boolean;
}

const deckOptions: DeckOption[] = [
  {
    id: 'full-system',
    title: 'Full System Overview',
    subtitle: 'Complete Bluecore ecosystem (17 pages)',
    icon: <Layers className="h-6 w-6 text-indigo-600" />,
    available: true,
    tagline: 'Decision-First Platform',
    componentVI: <FullSystemSalesDeckPDF />,
    componentEN: <FullSystemSalesDeckPDF_EN />,
    featured: true,
  },
  {
    id: 'fdp',
    title: 'FDP - Financial Data Platform',
    subtitle: 'Financial system sales deck',
    icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
    available: true,
    tagline: 'Truth > Flexibility',
    componentVI: <FDPSalesDeckPDF />,
    componentEN: <FDPSalesDeckPDF_EN />,
  },
  {
    id: 'mdp',
    title: 'MDP - Marketing Data Platform',
    subtitle: 'Marketing system sales deck',
    icon: <Building2 className="h-6 w-6 text-purple-600" />,
    available: true,
    tagline: 'Profit before Performance',
    componentVI: <MDPSalesDeckPDF />,
    componentEN: <MDPSalesDeckPDF_EN />,
  },
  {
    id: 'cdp',
    title: 'CDP - Customer Data Platform',
    subtitle: 'Customer system sales deck',
    icon: <Users className="h-6 w-6 text-green-600" />,
    available: true,
    tagline: 'Population > Individual',
    componentVI: <CDPSalesDeckPDF />,
    componentEN: <CDPSalesDeckPDF_EN />,
  },
  {
    id: 'control-tower',
    title: 'Control Tower',
    subtitle: 'Command center sales deck',
    icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
    available: true,
    tagline: 'Awareness before Analytics',
    componentVI: <ControlTowerSalesDeckPDF />,
    componentEN: <ControlTowerSalesDeckPDF_EN />,
  },
  {
    id: 'datawarehouse',
    title: 'Data Warehouse',
    subtitle: 'Data architecture sales deck',
    icon: <Database className="h-6 w-6 text-cyan-600" />,
    available: true,
    tagline: 'Single Source of Truth',
    componentVI: <DataWarehouseSalesDeckPDF />,
    componentEN: <DataWarehouseSalesDeckPDF_EN />,
  },
];

interface DeckCardProps {
  deck: DeckOption;
  language: 'vi' | 'en';
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, language }) => {
  const component = language === 'vi' ? deck.componentVI : deck.componentEN;
  const fileName = `Bluecore_${deck.id.toUpperCase()}_SalesDeck_${language.toUpperCase()}.pdf`;

  return (
    <Card className={`relative ${!deck.available ? 'opacity-60' : ''} ${deck.featured ? 'ring-2 ring-primary border-primary/30 bg-card' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${deck.featured ? 'bg-primary/15' : 'bg-muted'}`}>{deck.icon}</div>
          {deck.featured ? (
            <Badge variant="default" className="bg-primary text-primary-foreground">
              {language === 'vi' ? 'Đề xuất' : 'Recommended'}
            </Badge>
          ) : deck.available ? (
            <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {language === 'vi' ? 'Sẵn sàng' : 'Ready'}
            </Badge>
          ) : (
            <Badge variant="secondary">{language === 'vi' ? 'Đang phát triển' : 'Coming soon'}</Badge>
          )}
        </div>
        <CardTitle className="text-lg mt-3 text-foreground">{deck.title}</CardTitle>
        <CardDescription className="text-muted-foreground">{deck.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground italic">"{deck.tagline}"</span>
          
          {deck.available && component ? (
            <PDFDownloadLink document={component} fileName={fileName}>
              {({ loading }) => (
                <Button size="sm" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === 'vi' ? 'Đang tạo...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      {language === 'vi' ? 'Tải PDF' : 'Download PDF'}
                    </>
                  )}
                </Button>
              )}
            </PDFDownloadLink>
          ) : (
            <Button size="sm" disabled variant="secondary">
              <FileDown className="mr-2 h-4 w-4" />
              {language === 'vi' ? 'Sắp có' : 'Coming soon'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const SalesDeckDownloader: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Sales Deck Library</h2>
        <p className="text-muted-foreground">
          Download professional sales decks for each Bluecore module
        </p>
      </div>

      <Tabs defaultValue="vi" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid grid-cols-2 w-[300px]">
            <TabsTrigger value="vi" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Tiếng Việt
            </TabsTrigger>
            <TabsTrigger value="en" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              English
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="vi">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deckOptions.map((deck) => (
              <DeckCard key={deck.id} deck={deck} language="vi" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="en">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deckOptions.map((deck) => (
              <DeckCard key={deck.id} deck={deck} language="en" />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>
          Sales Decks are auto-generated from system content. Contact the team for customization requests.
        </p>
      </div>
    </div>
  );
};

export default SalesDeckDownloader;
