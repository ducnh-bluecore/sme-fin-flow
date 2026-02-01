/**
 * Sales Deck Downloader Component
 * 
 * Provides UI for downloading PDF sales decks for different modules
 * Supports both Vietnamese and English versions
 * Uses pdf() function for reliable PDF generation instead of PDFDownloadLink
 */

import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Loader2, Building2, TrendingUp, Users, AlertTriangle, Database, Layers, Globe } from 'lucide-react';
import { toast } from 'sonner';

import { sanitizePdfElement } from './pdfStyleSanitizer';

// Direct imports for PDF generation
import FDPSalesDeckPDF from './FDPSalesDeckPDF';
import MDPSalesDeckPDF from './MDPSalesDeckPDF';
import CDPSalesDeckPDF from './CDPSalesDeckPDF';
import ControlTowerSalesDeckPDF from './ControlTowerSalesDeckPDF';
import DataWarehouseSalesDeckPDF from './DataWarehouseSalesDeckPDF';
import FullSystemSalesDeckPDF from './FullSystemSalesDeckPDF';

import FDPSalesDeckPDF_EN from './FDPSalesDeckPDF_EN';
import MDPSalesDeckPDF_EN from './MDPSalesDeckPDF_EN';
import CDPSalesDeckPDF_EN from './CDPSalesDeckPDF_EN';
import ControlTowerSalesDeckPDF_EN from './ControlTowerSalesDeckPDF_EN';
import DataWarehouseSalesDeckPDF_EN from './DataWarehouseSalesDeckPDF_EN';
import FullSystemSalesDeckPDF_EN from './FullSystemSalesDeckPDF_EN';

type DeckId = 'full-system' | 'fdp' | 'mdp' | 'cdp' | 'control-tower' | 'datawarehouse';

// Bump this when deck content changes to avoid users opening an older cached PDF with the same filename
const DECK_BUILD_TAG = 'v20260201';

interface DeckOption {
  id: DeckId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  available: boolean;
  tagline: string;
  featured?: boolean;
}

const deckOptions: DeckOption[] = [
  {
    id: 'full-system',
    title: 'Full System Overview',
    subtitle: 'Complete Bluecore ecosystem (20 pages)',
    icon: <Layers className="h-6 w-6 text-indigo-600" />,
    available: true,
    tagline: 'Decision-First Platform',
    featured: true,
  },
  {
    id: 'fdp',
    title: 'FDP - Financial Data Platform',
    subtitle: 'Financial system sales deck',
    icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
    available: true,
    tagline: 'Truth > Flexibility',
  },
  {
    id: 'mdp',
    title: 'MDP - Marketing Data Platform',
    subtitle: 'Marketing system sales deck',
    icon: <Building2 className="h-6 w-6 text-purple-600" />,
    available: true,
    tagline: 'Profit before Performance',
  },
  {
    id: 'cdp',
    title: 'CDP - Customer Data Platform',
    subtitle: 'Customer system sales deck',
    icon: <Users className="h-6 w-6 text-green-600" />,
    available: true,
    tagline: 'Population > Individual',
  },
  {
    id: 'control-tower',
    title: 'Control Tower',
    subtitle: 'Command center sales deck',
    icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
    available: true,
    tagline: 'Awareness before Analytics',
  },
  {
    id: 'datawarehouse',
    title: 'Data Warehouse',
    subtitle: 'Data architecture sales deck',
    icon: <Database className="h-6 w-6 text-cyan-600" />,
    available: true,
    tagline: 'Single Source of Truth',
  },
];

// Get PDF component by deck ID and language
const getPDFComponent = (deckId: DeckId, language: 'vi' | 'en'): React.ReactElement => {
  const components = {
    'full-system': { vi: <FullSystemSalesDeckPDF />, en: <FullSystemSalesDeckPDF_EN /> },
    'fdp': { vi: <FDPSalesDeckPDF />, en: <FDPSalesDeckPDF_EN /> },
    'mdp': { vi: <MDPSalesDeckPDF />, en: <MDPSalesDeckPDF_EN /> },
    'cdp': { vi: <CDPSalesDeckPDF />, en: <CDPSalesDeckPDF_EN /> },
    'control-tower': { vi: <ControlTowerSalesDeckPDF />, en: <ControlTowerSalesDeckPDF_EN /> },
    'datawarehouse': { vi: <DataWarehouseSalesDeckPDF />, en: <DataWarehouseSalesDeckPDF_EN /> },
  };
  return components[deckId][language];
};

interface DeckCardProps {
  deck: DeckOption;
  language: 'vi' | 'en';
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, language }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const fileName = `Bluecore_${deck.id.toUpperCase()}_SalesDeck_${language.toUpperCase()}_${DECK_BUILD_TAG}.pdf`;

  const handleDownload = async () => {
    if (!deck.available) return;
    
    setIsGenerating(true);
    toast.info(language === 'vi' ? 'Đang tạo PDF...' : 'Generating PDF...', {
      description: language === 'vi' ? 'Vui lòng đợi trong giây lát' : 'Please wait a moment',
    });

    try {
      const pdfComponent = getPDFComponent(deck.id, language);
      const blob = await pdf(sanitizePdfElement(pdfComponent)).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(language === 'vi' ? 'Tải xuống thành công!' : 'Download complete!', {
        description: fileName,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('PDF generation error:', {
        deckId: deck.id,
        language,
        fileName,
        message: err.message,
        stack: err.stack,
        raw: error,
      });
      toast.error(language === 'vi' ? 'Lỗi tạo PDF' : 'PDF generation error', {
        description: language === 'vi' 
          ? 'Vui lòng thử lại sau' 
          : 'Please try again later',
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
          
          {deck.available ? (
            <Button size="sm" onClick={handleDownload} disabled={isGenerating}>
              {isGenerating ? (
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
