import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquareText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BLUECORE MDP SALES DECK - CMO/CEO VERSION
 * Focus: Marketing Financial Accountability
 * 
 * MDP = Marketing Decision Platform
 * Profit before Performance. Cash before Clicks.
 */

// ============== UI MOCKUPS ==============

function MarketingDecisionCardMockup() {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl max-w-md">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-widest text-slate-500">Marketing Decision</span>
        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-medium">STOP</span>
      </div>
      <h3 className="text-xl text-white font-semibold mb-2">Campaign: TikTok Flash Sale Q1</h3>
      <p className="text-sm text-slate-400 mb-6">Chiến dịch đang phá hủy margin</p>
      
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Revenue</span>
          <span className="text-emerald-400">↑ 2.4 tỷ</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Marketing Spend</span>
          <span className="text-slate-300">890 triệu</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Vanity ROAS</span>
          <span className="text-emerald-400">2.7x ✓</span>
        </div>
        <div className="h-px bg-slate-700 my-2" />
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">Profit ROAS</span>
          <span className="text-red-400 font-medium">0.4x ✗</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Contribution Margin</span>
          <span className="text-red-400">-12%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Cash Conversion @D+14</span>
          <span className="text-amber-400">38%</span>
        </div>
      </div>
      
      <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg mb-6">
        <p className="text-red-400 text-sm font-medium">💰 Đã mất: 534 triệu tiền thật</p>
        <p className="text-red-300 text-xs mt-1">Nếu tiếp tục 7 ngày: mất thêm 267 triệu</p>
      </div>
      
      <div className="flex gap-2">
        <button className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">
          STOP ngay
        </button>
        <button className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm">
          Cap budget 50%
        </button>
      </div>
    </div>
  );
}

function ProfitROASMockup() {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl max-w-md">
      <div className="px-6 py-4 border-b border-slate-800">
        <span className="text-white font-semibold">Profit ROAS vs Vanity ROAS</span>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Vanity ROAS (Ads Manager)</span>
            <span className="text-emerald-400 font-bold">3.2x</span>
          </div>
          <p className="text-xs text-slate-500">Doanh thu / Chi phí quảng cáo</p>
        </div>
        
        <div className="text-center text-slate-500">↓ trừ đi chi phí thật ↓</div>
        
        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Profit ROAS (Bluecore)</span>
            <span className="text-red-400 font-bold">0.6x</span>
          </div>
          <p className="text-xs text-slate-500">(Revenue - COGS - Ops - Ads) / Ads</p>
        </div>
        
        <div className="pt-4 border-t border-slate-800">
          <p className="text-sm text-slate-300">Chi phí chưa tính:</p>
          <ul className="text-xs text-slate-400 mt-2 space-y-1">
            <li>• Platform fees: 15%</li>
            <li>• Return rate: 12%</li>
            <li>• Shipping subsidy: 25k/đơn</li>
            <li>• Packaging: 8k/đơn</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function CashConversionMockup() {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl max-w-sm">
      <div className="px-6 py-4 border-b border-slate-800">
        <span className="text-white font-semibold">Cash Conversion Timeline</span>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">D+0 (Chi tiền ads)</span>
              <span className="text-red-400">-890 triệu</span>
            </div>
            <div className="h-2 bg-red-500/30 rounded" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">D+7</span>
              <span className="text-amber-400">+320 triệu (36%)</span>
            </div>
            <div className="h-2 bg-amber-500/30 rounded" style={{width: '36%'}} />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">D+14</span>
              <span className="text-amber-400">+534 triệu (60%)</span>
            </div>
            <div className="h-2 bg-amber-500/50 rounded" style={{width: '60%'}} />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">D+30</span>
              <span className="text-emerald-400">+712 triệu (80%)</span>
            </div>
            <div className="h-2 bg-emerald-500/50 rounded" style={{width: '80%'}} />
          </div>
        </div>
        
        <div className="mt-6 p-3 bg-amber-950/30 border border-amber-900/30 rounded-lg">
          <p className="text-amber-400 text-sm">⚠ Cash gap 30 ngày: 178 triệu</p>
        </div>
      </div>
    </div>
  );
}

function ChannelHealthMockup() {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl max-w-md">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <span className="text-white font-semibold">Channel Health</span>
        <span className="text-xs text-slate-500">Tuần này</span>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span className="text-white text-sm">Shopee</span>
          </div>
          <div className="text-right">
            <p className="text-emerald-400 text-sm font-medium">Profit ROAS 1.4x</p>
            <p className="text-xs text-slate-500">CM: +8%</p>
          </div>
        </div>
        
        <div className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            <span className="text-white text-sm">TikTok</span>
          </div>
          <div className="text-right">
            <p className="text-amber-400 text-sm font-medium">Profit ROAS 0.8x</p>
            <p className="text-xs text-slate-500">CM: -3%</p>
          </div>
        </div>
        
        <div className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-white text-sm">Facebook</span>
          </div>
          <div className="text-right">
            <p className="text-red-400 text-sm font-medium">Profit ROAS 0.3x</p>
            <p className="text-xs text-slate-500">CM: -18%</p>
          </div>
        </div>
        
        <div className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span className="text-white text-sm">Lazada</span>
          </div>
          <div className="text-right">
            <p className="text-emerald-400 text-sm font-medium">Profit ROAS 1.6x</p>
            <p className="text-xs text-slate-500">CM: +12%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== SLIDES ==============

function SlidePositioning() {
  return (
    <div className="flex flex-col justify-center items-start h-full px-20">
      <p className="text-sm uppercase tracking-widest text-blue-400 mb-4">Marketing Data Platform</p>
      <h1 className="text-6xl font-bold text-white tracking-tight mb-4">
        Bluecore MDP
      </h1>
      <h2 className="text-3xl font-light text-slate-300 mb-16">
        Profit before Performance. Cash before Clicks.
      </h2>
      
      <div className="max-w-3xl mb-12">
        <p className="text-2xl text-white leading-relaxed">
          MDP đo lường giá trị tài chính thật của Marketing,
          <span className="text-slate-400"> không phải metrics đẹp.</span>
        </p>
      </div>
      
      <div className="space-y-3 pl-6 border-l-2 border-slate-700">
        <p className="text-lg text-slate-500">ROAS cao → không có nghĩa là lãi</p>
        <p className="text-lg text-slate-500">Revenue tăng → không có nghĩa là có tiền</p>
        <p className="text-lg text-slate-500">Campaign "thành công" → có thể đang đốt tiền</p>
      </div>
    </div>
  );
}

function SlideMarketingProblem() {
  return (
    <div className="flex h-full px-20 py-16">
      <div className="w-1/2 flex flex-col justify-center pr-12">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-6">Vấn đề thực tế</p>
        <h1 className="text-5xl font-bold text-white leading-tight">
          Marketing báo thắng
        </h1>
        <h2 className="text-5xl font-bold text-red-400/80 mt-2">
          Finance báo lỗ
        </h2>
      </div>
      
      <div className="w-1/2 flex flex-col justify-center pl-12 border-l border-slate-800">
        <div className="space-y-6">
          <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-lg">
            <p className="text-emerald-400 font-medium mb-2">Marketing Report</p>
            <p className="text-slate-300">"ROAS 3.5x, tăng 40% so với tháng trước"</p>
            <p className="text-slate-300">"Revenue đạt 5 tỷ, vượt KPI"</p>
          </div>
          
          <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
            <p className="text-red-400 font-medium mb-2">Finance Report</p>
            <p className="text-slate-300">"Margin âm 8%"</p>
            <p className="text-slate-300">"Cash flow thiếu 1.2 tỷ"</p>
          </div>
          
          <p className="text-lg text-slate-400 italic mt-4">
            Ai đúng? Ai sai? CEO không biết tin ai.
          </p>
        </div>
      </div>
    </div>
  );
}

function SlideVanityVsProfit() {
  return (
    <div className="flex h-full px-20 py-12">
      <div className="w-1/2 flex flex-col justify-center pr-12">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">Vấn đề cốt lõi</p>
        <h1 className="text-4xl font-bold text-white mb-4">
          Vanity ROAS ≠ Profit ROAS
        </h1>
        
        <div className="space-y-6 mt-8">
          <div>
            <p className="text-lg text-slate-400 mb-2">Vanity ROAS (Ads Manager)</p>
            <p className="text-xl text-slate-200">Revenue / Ad Spend</p>
            <p className="text-sm text-slate-500 mt-1">Không tính: COGS, platform fees, shipping, returns...</p>
          </div>
          
          <div>
            <p className="text-lg text-white mb-2">Profit ROAS (Bluecore MDP)</p>
            <p className="text-xl text-emerald-400">(Revenue - All Costs) / Ad Spend</p>
            <p className="text-sm text-slate-500 mt-1">Lợi nhuận thật sau tất cả chi phí</p>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <p className="text-slate-300">
            Vanity ROAS 3.5x có thể = Profit ROAS 0.4x
          </p>
          <p className="text-slate-400 text-sm mt-1">
            → Càng scale càng lỗ
          </p>
        </div>
      </div>
      
      <div className="w-1/2 flex items-center justify-center pl-12">
        <ProfitROASMockup />
      </div>
    </div>
  );
}

function SlideCashConversion() {
  return (
    <div className="flex h-full px-20 py-12">
      <div className="w-1/2 flex flex-col justify-center pr-12">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">Marketing & Cash Flow</p>
        <h1 className="text-4xl font-bold text-white mb-4">
          Marketing tiêu tiền ngay
        </h1>
        <h2 className="text-4xl font-bold text-amber-400 mb-8">
          Tiền về sau 30-45 ngày
        </h2>
        
        <div className="space-y-4">
          <p className="text-lg text-slate-300">
            Ads spend → D+0 (trả ngay)
          </p>
          <p className="text-lg text-slate-300">
            Revenue → D+7 đến D+45 (tiền về chậm)
          </p>
          <p className="text-lg text-slate-300">
            Returns → D+14 (mất thêm tiền)
          </p>
        </div>
        
        <div className="mt-8 p-4 bg-amber-950/30 border border-amber-900/30 rounded-lg">
          <p className="text-amber-400 font-medium">Cash Conversion Gap</p>
          <p className="text-slate-300 text-sm mt-1">
            Khoảng cách giữa tiền chi và tiền thu thật
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Scale nhanh = Cash gap lớn = Rủi ro thanh khoản
          </p>
        </div>
      </div>
      
      <div className="w-1/2 flex items-center justify-center pl-12">
        <CashConversionMockup />
      </div>
    </div>
  );
}

function SlideWhatMDPDoes() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">Bluecore MDP làm gì</p>
      
      <h1 className="text-4xl font-bold text-white mb-12">
        Đo lường giá trị tài chính thật của Marketing
      </h1>
      
      <div className="grid grid-cols-2 gap-8 max-w-4xl">
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-blue-400 font-medium mb-3">Profit Attribution</p>
          <p className="text-slate-300">Mỗi campaign, mỗi kênh → Contribution Margin thật</p>
        </div>
        
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-blue-400 font-medium mb-3">Cash Impact</p>
          <p className="text-slate-300">Marketing đang tạo ra hay khóa bao nhiêu tiền mặt</p>
        </div>
        
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-blue-400 font-medium mb-3">True CAC</p>
          <p className="text-slate-300">Chi phí có khách hàng thật (sau returns, sau fraud)</p>
        </div>
        
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-blue-400 font-medium mb-3">LTV:CAC Thật</p>
          <p className="text-slate-300">Giá trị khách hàng so với chi phí thật</p>
        </div>
      </div>
      
      <p className="text-lg text-slate-500 mt-12 pl-6 border-l-2 border-slate-700">
        MDP không thay thế Ads Manager. MDP cho CFO/CEO biết marketing có đang tạo giá trị hay không.
      </p>
    </div>
  );
}

function SlideMarketingDecisionCard() {
  return (
    <div className="flex h-full px-20 py-12">
      <div className="w-1/2 flex flex-col justify-center pr-12">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">Đơn vị quyết định</p>
        <h1 className="text-4xl font-bold text-white mb-8">
          Marketing Decision Card
        </h1>
        
        <div className="space-y-4 mb-8">
          <p className="text-lg text-slate-300">
            Mỗi campaign được đánh giá bằng:
          </p>
          <ul className="space-y-2 text-lg text-slate-200">
            <li>• Profit ROAS (không phải Vanity ROAS)</li>
            <li>• Contribution Margin thật</li>
            <li>• Cash Conversion rate</li>
            <li>• Financial impact (VND)</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <p className="text-lg text-white font-medium">3 loại quyết định:</p>
          <div className="flex gap-3">
            <span className="px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded text-sm">SCALE</span>
            <span className="px-3 py-1 bg-amber-600/20 text-amber-400 rounded text-sm">PAUSE</span>
            <span className="px-3 py-1 bg-red-600/20 text-red-400 rounded text-sm">STOP</span>
          </div>
        </div>
      </div>
      
      <div className="w-1/2 flex items-center justify-center pl-12">
        <MarketingDecisionCardMockup />
      </div>
    </div>
  );
}

function SlideDecisionRules() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">Logic quyết định</p>
      <h1 className="text-4xl font-bold text-white mb-12">
        Quy tắc rõ ràng, không cảm tính
      </h1>
      
      <div className="space-y-6 max-w-4xl">
        <div className="p-6 border-l-4 border-red-500 bg-slate-900/50 rounded-r-lg">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded font-medium">STOP</span>
            <span className="text-white font-medium">Dừng ngay lập tức</span>
          </div>
          <p className="text-slate-300">Profit ROAS &lt; 0 trong 3 ngày liên tiếp</p>
          <p className="text-slate-400 text-sm mt-1">Hoặc: Contribution Margin &lt; -10%</p>
        </div>
        
        <div className="p-6 border-l-4 border-amber-500 bg-slate-900/50 rounded-r-lg">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-amber-600/20 text-amber-400 text-xs rounded font-medium">PAUSE</span>
            <span className="text-white font-medium">Tạm dừng để đánh giá</span>
          </div>
          <p className="text-slate-300">Cash Conversion &lt; 50% tại D+14</p>
          <p className="text-slate-400 text-sm mt-1">Hoặc: Profit ROAS 0 - 0.5x</p>
        </div>
        
        <div className="p-6 border-l-4 border-emerald-500 bg-slate-900/50 rounded-r-lg">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded font-medium">SCALE</span>
            <span className="text-white font-medium">Tăng ngân sách</span>
          </div>
          <p className="text-slate-300">CM% ≥ 15% VÀ Cash Conversion ≥ 70%</p>
          <p className="text-slate-400 text-sm mt-1">VÀ: Profit ROAS ≥ 1.0x</p>
        </div>
      </div>
    </div>
  );
}

function SlideChannelHealth() {
  return (
    <div className="flex h-full px-20 py-12">
      <div className="w-1/2 flex flex-col justify-center pr-12">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">Channel Overview</p>
        <h1 className="text-4xl font-bold text-white mb-4">
          Kênh nào đang tạo giá trị?
        </h1>
        <h2 className="text-4xl font-bold text-slate-400 mb-8">
          Kênh nào đang đốt tiền?
        </h2>
        
        <div className="space-y-4">
          <p className="text-lg text-slate-300">
            MDP đánh giá từng kênh bằng Profit ROAS và Contribution Margin:
          </p>
          
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
            <span className="text-slate-200">Profitable: Profit ROAS ≥ 1.0x</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
            <span className="text-slate-200">At Risk: Profit ROAS 0.5 - 1.0x</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-slate-200">Burning Cash: Profit ROAS &lt; 0.5x</span>
          </div>
        </div>
      </div>
      
      <div className="w-1/2 flex items-center justify-center pl-12">
        <ChannelHealthMockup />
      </div>
    </div>
  );
}

function SlideForCFO() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">Thiết kế cho CFO & CEO</p>
      
      <h1 className="text-4xl font-bold text-white mb-4">
        MDP phục vụ CFO & CEO trước
      </h1>
      <h2 className="text-4xl font-bold text-slate-400 mb-12">
        Marketer buộc phải điều chỉnh sau
      </h2>
      
      <div className="flex gap-12 max-w-4xl">
        <div className="flex-1">
          <p className="text-lg text-slate-400 mb-4">Marketer thích:</p>
          <ul className="space-y-2 text-lg text-slate-500">
            <li>• ROAS cao</li>
            <li>• Revenue tăng</li>
            <li>• Traffic nhiều</li>
            <li>• Conversion tốt</li>
          </ul>
        </div>
        
        <div className="flex-1">
          <p className="text-lg text-white mb-4">CFO cần biết:</p>
          <ul className="space-y-2 text-lg text-slate-200">
            <li>• Có lãi không?</li>
            <li>• Tiền về khi nào?</li>
            <li>• Rủi ro cash bao nhiêu?</li>
            <li>• Nên tiếp tục không?</li>
          </ul>
        </div>
      </div>
      
      <p className="text-lg text-slate-500 mt-12 pl-6 border-l-2 border-slate-700">
        Nếu insight marketing mà CFO không tin → MDP coi là thất bại.
      </p>
    </div>
  );
}

function SlideExamples() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">Ví dụ thực tế</p>
      
      <div className="grid grid-cols-3 gap-8 max-w-5xl">
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-sm text-slate-500 mb-4">Case 1</p>
          <h3 className="text-lg text-white mb-4">Flash Sale "thành công"</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-400">ROAS: <span className="text-emerald-400">4.2x</span></p>
            <p className="text-slate-400">Revenue: <span className="text-emerald-400">+3 tỷ</span></p>
            <div className="h-px bg-slate-700 my-2" />
            <p className="text-slate-400">Profit ROAS: <span className="text-red-400">0.3x</span></p>
            <p className="text-slate-400">Cash Gap: <span className="text-red-400">-890 triệu</span></p>
            <p className="text-white mt-4">→ STOP + never repeat</p>
          </div>
        </div>
        
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-sm text-slate-500 mb-4">Case 2</p>
          <h3 className="text-lg text-white mb-4">Channel "yếu" nhưng lãi</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-400">ROAS: <span className="text-amber-400">1.8x</span></p>
            <p className="text-slate-400">Volume: <span className="text-slate-400">thấp</span></p>
            <div className="h-px bg-slate-700 my-2" />
            <p className="text-slate-400">Profit ROAS: <span className="text-emerald-400">1.4x</span></p>
            <p className="text-slate-400">CM: <span className="text-emerald-400">+18%</span></p>
            <p className="text-white mt-4">→ SCALE carefully</p>
          </div>
        </div>
        
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-sm text-slate-500 mb-4">Case 3</p>
          <h3 className="text-lg text-white mb-4">Influencer campaign</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-400">ROAS: <span className="text-emerald-400">5.0x</span></p>
            <p className="text-slate-400">Engagement: <span className="text-emerald-400">cao</span></p>
            <div className="h-px bg-slate-700 my-2" />
            <p className="text-slate-400">Return rate: <span className="text-red-400">35%</span></p>
            <p className="text-slate-400">True CAC: <span className="text-red-400">3x stated</span></p>
            <p className="text-white mt-4">→ PAUSE + restructure</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideValue() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">Giá trị MDP mang lại</p>
      
      <h1 className="text-4xl font-bold text-white mb-12">
        Ngăn doanh nghiệp chết vì marketing
      </h1>
      
      <div className="grid grid-cols-2 gap-8 max-w-4xl">
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-3xl font-bold text-white mb-2">-70%</p>
          <p className="text-slate-400">Giảm chi phí marketing lãng phí</p>
        </div>
        
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-3xl font-bold text-white mb-2">+15%</p>
          <p className="text-slate-400">Tăng Contribution Margin</p>
        </div>
        
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-3xl font-bold text-white mb-2">2 tuần</p>
          <p className="text-slate-400">Giảm thời gian phát hiện campaign lỗ</p>
        </div>
        
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-3xl font-bold text-white mb-2">30 giây</p>
          <p className="text-slate-400">CEO/CFO hiểu marketing health</p>
        </div>
      </div>
    </div>
  );
}

function SlideClosing() {
  return (
    <div className="flex flex-col justify-center items-center h-full px-20 text-center">
      <div className="max-w-3xl space-y-12">
        <div className="p-8 border border-slate-800 rounded-lg">
          <p className="text-2xl text-slate-400">
            "Marketing không chỉ bán hàng
          </p>
          <p className="text-2xl text-white font-medium mt-2">
            Marketing tiêu tiền"
          </p>
        </div>
        
        <div>
          <p className="text-xl text-slate-400">
            MDP đảm bảo mỗi đồng marketing
          </p>
          <p className="text-xl text-white mt-2">
            được đo lường bằng lợi nhuận thật, không phải metrics đẹp.
          </p>
        </div>
        
        <div className="pt-8 border-t border-slate-800">
          <p className="text-lg text-blue-400 font-medium">
            Profit before Performance.
          </p>
          <p className="text-lg text-blue-400 font-medium">
            Cash before Clicks.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============== PRESENTER NOTES ==============

const presenterNotes: Record<number, { title: string; points: string[]; tips?: string }> = {
  0: {
    title: "Định vị MDP",
    points: [
      "MDP = Marketing Data Platform, không phải marketing tool",
      "Slogan: Profit before Performance, Cash before Clicks",
      "ROAS cao ≠ lãi, Revenue tăng ≠ có tiền",
    ],
    tips: "Hỏi CEO: Có bao giờ marketing báo thắng mà cuối tháng vẫn thiếu tiền không?"
  },
  1: {
    title: "Marketing vs Finance conflict",
    points: [
      "Marketing: ROAS 3.5x, revenue vượt KPI",
      "Finance: Margin âm, cash flow thiếu",
      "CEO không biết tin ai - đây là vấn đề thật",
    ],
    tips: "Đây là pain point cực kỳ phổ biến - dừng lại cho CEO xác nhận"
  },
  2: {
    title: "Vanity ROAS vs Profit ROAS",
    points: [
      "Vanity ROAS = Revenue / Ad Spend (Ads Manager)",
      "Profit ROAS = (Revenue - ALL Costs) / Ad Spend",
      "Vanity 3.5x có thể = Profit 0.4x → càng scale càng lỗ",
    ],
    tips: "Chỉ vào mockup và giải thích từng chi phí bị bỏ qua"
  },
  3: {
    title: "Cash Conversion của Marketing",
    points: [
      "Ads spend trả ngay (D+0)",
      "Revenue về sau 30-45 ngày",
      "Scale nhanh = Cash gap lớn = Rủi ro thanh khoản",
    ],
    tips: "Đây là điểm mà nhiều CEO chưa bao giờ nghĩ đến"
  },
  4: {
    title: "MDP làm gì",
    points: [
      "Profit Attribution: mỗi campaign → CM thật",
      "Cash Impact: marketing đang tạo hay khóa tiền mặt",
      "True CAC và LTV:CAC thật",
    ],
    tips: "MDP không thay Ads Manager, MDP cho CFO biết marketing có đang tạo giá trị không"
  },
  5: {
    title: "Marketing Decision Card",
    points: [
      "Đánh giá bằng: Profit ROAS, CM, Cash Conversion",
      "3 quyết định: SCALE / PAUSE / STOP",
      "Financial impact = bao nhiêu tiền thật",
    ],
    tips: "Chỉ vào mockup: Đây là cách CFO nhìn một campaign"
  },
  6: {
    title: "Quy tắc quyết định",
    points: [
      "STOP: Profit ROAS < 0 trong 3 ngày hoặc CM < -10%",
      "PAUSE: Cash Conversion < 50% hoặc Profit ROAS 0-0.5x",
      "SCALE: CM ≥ 15% VÀ Cash Conversion ≥ 70%",
    ],
    tips: "Quy tắc rõ ràng, không cảm tính, không tranh cãi"
  },
  7: {
    title: "Channel Health",
    points: [
      "Từng kênh được đánh giá bằng Profit ROAS và CM",
      "Green: Profitable, Amber: At Risk, Red: Burning Cash",
      "CEO thấy ngay kênh nào nên scale, kênh nào nên cắt",
    ],
    tips: "Chỉ cần nhìn màu là biết, không cần phân tích"
  },
  8: {
    title: "Thiết kế cho CFO",
    points: [
      "MDP phục vụ CFO/CEO trước, Marketer sau",
      "Nếu CFO không tin insight → MDP coi là thất bại",
      "Marketer thích ROAS, CFO cần biết có lãi không",
    ],
    tips: "Đây là điểm khác biệt lớn nhất so với marketing tools khác"
  },
  9: {
    title: "Case studies",
    points: [
      "Flash Sale: ROAS 4.2x nhưng Profit ROAS 0.3x → STOP",
      "Channel yếu: ROAS 1.8x nhưng Profit ROAS 1.4x → SCALE",
      "Influencer: ROAS 5x nhưng return 35% → PAUSE",
    ],
    tips: "CEO nào cũng từng gặp ít nhất 1 case như vậy"
  },
  10: {
    title: "Giá trị MDP",
    points: [
      "-70% chi phí marketing lãng phí",
      "+15% Contribution Margin",
      "2 tuần phát hiện campaign lỗ sớm hơn",
    ],
    tips: "Đây là ROI story - nói con số cụ thể"
  },
  11: {
    title: "Câu chốt",
    points: [
      "Marketing tiêu tiền - cần được đo bằng lợi nhuận thật",
      "Profit before Performance, Cash before Clicks",
      "MDP ngăn doanh nghiệp chết vì marketing",
    ],
    tips: "Im lặng sau câu cuối"
  },
};

// ============== MAIN COMPONENT ==============

export default function MDPSalesDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(true);
  
  const slides = [
    { id: 0, component: SlidePositioning, label: 'Định vị MDP' },
    { id: 1, component: SlideMarketingProblem, label: 'Vấn đề' },
    { id: 2, component: SlideVanityVsProfit, label: 'Vanity vs Profit' },
    { id: 3, component: SlideCashConversion, label: 'Cash Conversion' },
    { id: 4, component: SlideWhatMDPDoes, label: 'MDP làm gì' },
    { id: 5, component: SlideMarketingDecisionCard, label: 'Decision Card' },
    { id: 6, component: SlideDecisionRules, label: 'Quy tắc' },
    { id: 7, component: SlideChannelHealth, label: 'Channel Health' },
    { id: 8, component: SlideForCFO, label: 'Cho CFO' },
    { id: 9, component: SlideExamples, label: 'Ví dụ' },
    { id: 10, component: SlideValue, label: 'Giá trị' },
    { id: 11, component: SlideClosing, label: 'Chốt' },
  ];
  
  const goToPrev = () => setCurrentSlide(prev => Math.max(0, prev - 1));
  const goToNext = () => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'n' || e.key === 'N') {
        setShowNotes(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const CurrentSlideComponent = slides[currentSlide].component;
  const currentNotes = presenterNotes[currentSlide];
  
  return (
    <div className="fixed inset-0 bg-slate-950 flex">
      {/* Main Slide Area */}
      <div className={cn("flex flex-col transition-all duration-300", showNotes ? "flex-1" : "w-full")}>
        <div className="flex-1 overflow-hidden">
          <CurrentSlideComponent />
        </div>
        
        {/* Navigation Footer */}
        <div className="h-14 border-t border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-1">
            {slides.map((slide, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                title={slide.label}
                className={cn(
                  "h-1 rounded-full transition-all",
                  idx === currentSlide 
                    ? "bg-blue-400 w-6" 
                    : "bg-slate-700 hover:bg-slate-600 w-1"
                )}
              />
            ))}
          </div>
          
          <div className="text-center">
            <span className="text-sm text-slate-500 font-mono">
              {currentSlide + 1} / {slides.length}
            </span>
            <span className="text-sm text-slate-600 ml-3">
              {slides[currentSlide].label}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotes(prev => !prev)}
              className={cn(
                "p-2 rounded transition-colors",
                showNotes ? "text-blue-400 bg-slate-800" : "text-slate-500 hover:text-white hover:bg-slate-800"
              )}
              title="Toggle notes (N)"
            >
              <MessageSquareText className="h-4 w-4" />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1" />
            <button
              onClick={goToPrev}
              disabled={currentSlide === 0}
              className={cn(
                "p-2 rounded transition-colors",
                currentSlide === 0 
                  ? "text-slate-700 cursor-not-allowed" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentSlide === slides.length - 1}
              className={cn(
                "p-2 rounded transition-colors",
                currentSlide === slides.length - 1 
                  ? "text-slate-700 cursor-not-allowed" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Presenter Notes Panel */}
      {showNotes && (
        <div className="w-80 border-l border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">Presenter Notes</h3>
            <button
              onClick={() => setShowNotes(false)}
              className="p-1 text-slate-500 hover:text-white rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {currentNotes && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">{currentNotes.title}</h4>
                
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Điểm chính</p>
                  <ul className="space-y-2">
                    {currentNotes.points.map((point, idx) => (
                      <li key={idx} className="text-sm text-slate-300 pl-3 border-l-2 border-blue-700">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {currentNotes.tips && (
                  <div className="p-3 bg-blue-950/30 border border-blue-900/30 rounded-lg">
                    <p className="text-xs uppercase tracking-widest text-blue-400 mb-2">💡 Tips</p>
                    <p className="text-sm text-blue-200">{currentNotes.tips}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-slate-800 text-xs text-slate-500">
            <p>Phím tắt: ← → điều hướng, N ẩn/hiện notes</p>
          </div>
        </div>
      )}
    </div>
  );
}
