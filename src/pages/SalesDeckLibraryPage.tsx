/**
 * Sales Deck Library Page
 * 
 * Page for downloading PDF sales decks for different modules
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SalesDeckDownloader } from '@/components/sales-deck';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Presentation, ArrowLeft } from 'lucide-react';

const SalesDeckLibraryPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Sales Deck Library | Bluecore</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        {/* Back Navigation */}
        <div className="fixed top-4 left-4 z-50">
          <Button asChild variant="outline" size="sm" className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50">
            <Link to="/portal">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại Portal
            </Link>
          </Button>
        </div>

        <div className="container max-w-6xl mx-auto py-16 px-6 space-y-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-primary/20 rounded-2xl mb-6">
              <Presentation className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Sales Deck Library</h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Tải về tài liệu Sales Deck chuyên nghiệp cho từng module của hệ thống Bluecore
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                  <FileText className="h-4 w-4 text-blue-400" />
                  PDF Chuyên nghiệp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-400">
                  Tài liệu được thiết kế chuyên nghiệp, sẵn sàng in ấn hoặc gửi email cho khách hàng.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                  <Download className="h-4 w-4 text-green-400" />
                  Nội dung Realtime
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-400">
                  Nội dung Sales Deck được tạo từ tính năng thực tế của hệ thống, luôn cập nhật.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                  <Presentation className="h-4 w-4 text-purple-400" />
                  Theo Module
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-400">
                  Tải riêng từng module (FDP, MDP, CDP) hoặc bản tổng quan Full System.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Deck Downloader */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Thư viện Sales Deck</CardTitle>
              <CardDescription className="text-slate-400">
                Chọn module muốn tải và nhấn nút "Tải PDF" để download
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesDeckDownloader />
            </CardContent>
          </Card>

          {/* Alternative: Interactive Decks */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Phiên bản Tương tác</CardTitle>
              <CardDescription className="text-slate-400">
                Xem Sales Deck trực tiếp trên web với animations và presenter notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button asChild variant="outline" className="justify-start h-auto py-4 border-slate-600 hover:bg-slate-700/50">
                  <Link to="/sales-kit/fdp-deck">
                    <div className="text-left">
                      <div className="font-semibold text-white">FDP Sales Deck</div>
                      <div className="text-xs text-slate-400">Phiên bản web tương tác</div>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start h-auto py-4 border-slate-600 hover:bg-slate-700/50">
                  <Link to="/sales-kit/mdp">
                    <div className="text-left">
                      <div className="font-semibold text-white">MDP Sales Deck</div>
                      <div className="text-xs text-slate-400">Phiên bản web tương tác</div>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start h-auto py-4 border-slate-600 hover:bg-slate-700/50 opacity-50 cursor-not-allowed" disabled>
                  <span>
                    <div className="text-left">
                      <div className="font-semibold text-white">CDP Sales Deck</div>
                      <div className="text-xs text-slate-400">Sắp ra mắt</div>
                    </div>
                  </span>
                </Button>
              </div>
              
              {/* VC Pitch Decks */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h4 className="text-sm font-medium text-slate-400 mb-4">VC Pitch Deck - Nhà đầu tư</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button asChild variant="outline" className="justify-start h-auto py-4 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50">
                    <Link to="/investor/vc-pitch">
                      <div className="text-left">
                        <div className="font-semibold text-white">VC Pitch Deck (EN)</div>
                        <div className="text-xs text-slate-400">Series A presentation - 23 slides</div>
                      </div>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start h-auto py-4 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50">
                    <Link to="/investor/vc-pitch-vi">
                      <div className="text-left">
                        <div className="font-semibold text-white">VC Pitch Deck (VI)</div>
                        <div className="text-xs text-slate-400">Bản trình bày Series A - 23 slides</div>
                      </div>
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SalesDeckLibraryPage;
