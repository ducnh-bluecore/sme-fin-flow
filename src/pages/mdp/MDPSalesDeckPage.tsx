import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquareText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BLUECORE MDP SALES DECK - CEO VERSION
 * With Presenter Notes & System Mockups
 */

// ============== UI MOCKUPS ==============

function DecisionCardMockup() {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl max-w-md">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-widest text-slate-500">Decision Card</span>
        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded">Cần quyết định</span>
      </div>
      <h3 className="text-xl text-white font-semibold mb-6">Có nên tiếp tục Campaign TikTok Q1?</h3>
      
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Revenue</span>
          <span className="text-emerald-400 flex items-center gap-1">↑ 2.4 tỷ</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Contribution Margin</span>
          <span className="text-red-400 flex items-center gap-1">↓ -8%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">AR Outstanding</span>
          <span className="text-amber-400 flex items-center gap-1">→ 45 ngày</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Inventory Locked</span>
          <span className="text-red-400 flex items-center gap-1">↓ 890 triệu</span>
        </div>
      </div>
      
      <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg mb-6">
        <p className="text-red-400 text-sm font-medium">⚠ Cash gap xuất hiện sau 21 ngày</p>
      </div>
      
      <div className="flex gap-2">
        <button className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm">Continue</button>
        <button className="flex-1 py-2 bg-amber-600/20 text-amber-400 border border-amber-600/30 rounded-lg text-sm">Adjust</button>
        <button className="flex-1 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg text-sm">Stop</button>
      </div>
    </div>
  );
}

function ControlTowerMockup() {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl max-w-lg">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <span className="text-white font-semibold">Control Tower</span>
        <span className="text-xs text-slate-500">Hôm nay · 14:32</span>
      </div>
      
      <div className="p-4 space-y-3">
        {/* Decision 1 */}
        <div className="p-4 bg-slate-800/50 border-l-4 border-red-500 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-white text-sm font-medium">Campaign TikTok Q1</span>
          </div>
          <p className="text-slate-400 text-xs">Cash gap trong 21 ngày · -890tr locked</p>
        </div>
        
        {/* Decision 2 */}
        <div className="p-4 bg-slate-800/50 border-l-4 border-amber-500 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            <span className="text-white text-sm font-medium">SKU Mix Shopee</span>
          </div>
          <p className="text-slate-400 text-xs">Margin giảm 12% · 3 SKU lỗ</p>
        </div>
        
        {/* Decision 3 */}
        <div className="p-4 bg-slate-800/50 border-l-4 border-slate-600 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
            <span className="text-white text-sm font-medium">Điều khoản thanh toán B2B</span>
          </div>
          <p className="text-slate-400 text-xs">DSO tăng 8 ngày · AR 2.1 tỷ</p>
        </div>
      </div>
      
      <div className="px-6 py-3 bg-slate-800/30 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center">3 quyết định cần xử lý hôm nay</p>
      </div>
    </div>
  );
}

function BoardViewMockup() {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl max-w-md">
      <div className="p-6 bg-red-950/20 border-b border-red-900/30">
        <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Tình trạng</p>
        <p className="text-2xl font-bold text-red-400">CẦN CAN THIỆP</p>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Critical Situations</p>
          <p className="text-4xl font-bold text-white">3</p>
        </div>
        
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Financial Exposure</p>
          <p className="text-4xl font-bold text-white">₫4.2 tỷ</p>
        </div>
        
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Time to Next Risk</p>
          <p className="text-4xl font-bold text-amber-400">21 ngày</p>
        </div>
      </div>
    </div>
  );
}

// ============== SLIDE COMPONENTS ==============

// Slide 0: Positioning
function SlidePositioning() {
  return (
    <div className="flex flex-col justify-center items-start h-full px-20">
      <h1 className="text-6xl font-bold text-white tracking-tight mb-8">
        Bluecore MDP
      </h1>
      <h2 className="text-3xl font-light text-slate-300 mb-16">
        Không bán phần mềm
      </h2>
      
      <div className="max-w-3xl mb-16">
        <p className="text-2xl text-white leading-relaxed">
          Bluecore MDP bán năng lực ra quyết định
          <span className="text-slate-400"> đúng, nhanh và có trách nhiệm tài chính.</span>
        </p>
      </div>
      
      <div className="space-y-3 pl-6 border-l-2 border-slate-700">
        <p className="text-lg text-slate-500">Dashboard → không phải Bluecore</p>
        <p className="text-lg text-slate-500">BI → không phải Bluecore</p>
        <p className="text-lg text-slate-500">Marketing tool → không phải Bluecore</p>
      </div>
      
      <p className="text-xl text-slate-300 mt-16 max-w-2xl">
        Bluecore MDP dành cho CEO đã có dữ liệu, nhưng không dám tin để quyết nhanh.
      </p>
    </div>
  );
}

// Slide 1: CEO Reality - Illusion of Control
function SlideCEOReality() {
  return (
    <div className="flex h-full px-20 py-16">
      <div className="w-1/2 flex flex-col justify-center pr-12">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-6">Bối cảnh thực tế</p>
        <h1 className="text-5xl font-bold text-white leading-tight">
          CEO đang sống trong
        </h1>
        <h2 className="text-5xl font-bold text-amber-400/80 mt-2">
          "ảo giác kiểm soát"
        </h2>
      </div>
      
      <div className="w-1/2 flex flex-col justify-center pl-12 border-l border-slate-800">
        <div className="space-y-6 mb-12">
          <p className="text-xl text-slate-400">CEO được cung cấp:</p>
          <ul className="space-y-2 text-lg text-slate-300">
            <li>• Báo cáo doanh thu</li>
            <li>• Báo cáo lợi nhuận</li>
            <li>• Báo cáo marketing</li>
            <li>• Báo cáo tồn kho</li>
          </ul>
        </div>
        
        <div className="p-6 bg-slate-900/50 rounded-lg border border-slate-800">
          <p className="text-lg text-slate-400 mb-4">Nhưng thực tế:</p>
          <p className="text-lg text-slate-300 italic">
            "Số này bên em đang tạm tính"
          </p>
          <p className="text-lg text-slate-300 italic">
            "Để em kiểm tra lại với kế toán / vận hành"
          </p>
        </div>
      </div>
    </div>
  );
}

// Slide 2: The Real Problem
function SlideRealProblem() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">Vấn đề thật sự</p>
      
      <div className="flex gap-20 mb-16">
        <div className="flex-1">
          <h2 className="text-2xl text-slate-400 mb-6">CEO không thiếu:</h2>
          <ul className="space-y-3 text-xl text-slate-500">
            <li>ERP</li>
            <li>POS</li>
            <li>OMS</li>
            <li>Kế toán</li>
            <li>Marketing platforms</li>
          </ul>
        </div>
        
        <div className="flex-1">
          <h2 className="text-2xl text-white mb-6">CEO thiếu:</h2>
          <ul className="space-y-3 text-xl text-slate-200">
            <li>Một sự thật thống nhất</li>
            <li>Một kết luận có thể hành động</li>
            <li>Một nơi chịu trách nhiệm cho quyết định</li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-3xl">
        <p className="text-3xl font-bold text-white">
          CEO không kiểm soát bằng dữ liệu
        </p>
        <p className="text-3xl font-bold text-slate-400 mt-2">
          CEO kiểm soát bằng niềm tin mù
        </p>
      </div>
    </div>
  );
}

// Slide 3: Why Dashboard Fails
function SlideDashboardFails() {
  return (
    <div className="flex flex-col justify-center items-center h-full px-20 text-center">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">
        Vì sao Dashboard & BI thất bại với CEO
      </p>
      
      <h1 className="text-4xl font-bold text-slate-400 mb-6">
        Dashboard trả lời câu hỏi sai
      </h1>
      
      <div className="flex gap-16 my-16 max-w-4xl">
        <div className="flex-1 text-left p-8 border border-slate-800 rounded-lg">
          <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">Dashboard trả lời</p>
          <p className="text-xl text-slate-400">"Đã xảy ra chuyện gì?"</p>
          <p className="text-xl text-slate-400">"Số liệu đang như thế nào?"</p>
        </div>
        
        <div className="flex-1 text-left p-8 border border-white/20 rounded-lg bg-slate-900/30">
          <p className="text-sm uppercase tracking-widest text-slate-400 mb-4">CEO cần</p>
          <p className="text-xl text-white">"Tôi nên làm gì?"</p>
          <p className="text-xl text-white">"Nếu tôi làm X, hậu quả tài chính thật là gì?"</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-lg text-slate-500">Dashboard = quan sát</p>
        <p className="text-lg text-white">Decision System = hành động</p>
      </div>
    </div>
  );
}

// Slide 4: BI Makes CEO Slower
function SlideBISlower() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <h1 className="text-5xl font-bold text-white mb-4">
        BI càng mạnh
      </h1>
      <h2 className="text-5xl font-bold text-slate-400 mb-16">
        CEO càng chậm
      </h2>
      
      <div className="flex gap-16 max-w-4xl">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-widest text-slate-500 mb-6">BI cho</p>
          <ul className="space-y-3 text-xl text-slate-400">
            <li>Drill-down</li>
            <li>Slice & dice</li>
            <li>Filters</li>
            <li>Custom views</li>
          </ul>
        </div>
        
        <div className="flex-1">
          <p className="text-sm uppercase tracking-widest text-slate-500 mb-6">Nhưng</p>
          <ul className="space-y-3 text-xl text-slate-300">
            <li>CEO không có thời gian phân tích</li>
            <li>CEO không muốn trở thành analyst</li>
            <li className="text-white font-medium">CEO muốn kết luận đáng tin</li>
          </ul>
        </div>
      </div>
      
      <p className="text-lg text-slate-500 mt-16 pl-6 border-l-2 border-slate-700">
        Bluecore cố tình không cho drill-down trong demo CEO.
      </p>
    </div>
  );
}

// Slide 5: What Bluecore Solves
function SlideWhatBluecore() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">Bluecore MDP giải quyết gì</p>
      
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-slate-400 leading-tight">
          Bluecore không thay ERP / BI / Kế toán / Marketing tools
        </h1>
      </div>
      
      <div className="max-w-3xl mb-16 p-8 border border-white/10 rounded-lg bg-slate-900/30">
        <p className="text-2xl text-white leading-relaxed">
          Bluecore đứng trên tất cả các hệ đó để trả lời:
        </p>
        <p className="text-2xl text-slate-300 mt-4 italic">
          "Với toàn bộ dữ liệu đã reconcile, quyết định nào là an toàn / nguy hiểm?"
        </p>
      </div>
      
      <div className="space-y-2">
        <p className="text-xl text-white font-medium">
          Bluecore MDP = Decision Layer
        </p>
        <p className="text-lg text-slate-500">
          Không có khái niệm "xem cho biết", "tham khảo", "theo dõi"
        </p>
      </div>
    </div>
  );
}

// Slide 6: Decision Card with Mockup
function SlideDecisionCard() {
  return (
    <div className="flex h-full px-20 py-12">
      <div className="w-1/2 flex flex-col justify-center pr-12">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">Đơn vị giá trị cốt lõi</p>
        <h1 className="text-4xl font-bold text-white mb-8">
          Decision Card
        </h1>
        
        <div className="space-y-4 mb-8">
          <p className="text-lg text-slate-400">Decision Card không:</p>
          <ul className="space-y-2 text-lg text-slate-500">
            <li>× Liệt kê chỉ số</li>
            <li>× Kể câu chuyện dài</li>
            <li>× Thuyết phục bằng đồ thị</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <p className="text-lg text-white">Decision Card:</p>
          <ul className="space-y-2 text-lg text-slate-200">
            <li>✓ Đặt ra 1 quyết định</li>
            <li>✓ Chỉ ra rủi ro tài chính thật</li>
            <li>✓ Đưa ra 3 lựa chọn: Continue / Adjust / Stop</li>
          </ul>
        </div>
      </div>
      
      <div className="w-1/2 flex items-center justify-center pl-12">
        <DecisionCardMockup />
      </div>
    </div>
  );
}

// Slide 7: Control Tower Experience with Mockup
function SlideControlTower() {
  return (
    <div className="flex h-full px-20 py-12">
      <div className="w-1/2 flex flex-col justify-center pr-12">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">Cách CEO sử dụng Bluecore</p>
        
        <h1 className="text-4xl font-bold text-white mb-4">
          Control Tower
        </h1>
        <h2 className="text-2xl font-light text-slate-400 mb-12">
          "Hôm nay CEO cần quyết gì?"
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">Trải nghiệm lý tưởng</p>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-slate-600 font-mono text-sm">01</span>
              <span className="text-lg text-slate-300">Mở Bluecore</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-600 font-mono text-sm">02</span>
              <span className="text-lg text-slate-300">Thấy 3–5 Decision Cards</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-600 font-mono text-sm">03</span>
              <span className="text-lg text-white font-medium">Quyết trong 30–60 giây</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-600 font-mono text-sm">04</span>
              <span className="text-lg text-slate-300">Đóng lại</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-slate-500 mt-8 pl-4 border-l-2 border-slate-700">
          Bluecore được thiết kế để CEO không ở lại lâu.
        </p>
      </div>
      
      <div className="w-1/2 flex items-center justify-center pl-12">
        <ControlTowerMockup />
      </div>
    </div>
  );
}

// Slide 8: Board View with Mockup
function SlideBoardView() {
  return (
    <div className="flex h-full px-20 py-12">
      <div className="w-1/2 flex flex-col justify-center pr-12">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">CEO Board View</p>
        
        <h1 className="text-4xl font-bold text-white mb-4">
          30 giây biết sức khỏe công ty
        </h1>
        
        <div className="space-y-6 mt-8">
          <div>
            <p className="text-lg text-slate-400 mb-2">Chỉ 3 con số:</p>
            <ul className="space-y-2 text-lg text-slate-200">
              <li>• Số tình huống nguy hiểm</li>
              <li>• Tổng rủi ro tài chính</li>
              <li>• Thời gian đến rủi ro tiếp theo</li>
            </ul>
          </div>
          
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
            <p className="text-sm text-slate-500 mb-2">Không có:</p>
            <p className="text-slate-400">Charts · Drill-down · Filters · Tables</p>
          </div>
        </div>
        
        <p className="text-lg text-white mt-8">
          CEO đọc → biết → quyết
        </p>
      </div>
      
      <div className="w-1/2 flex items-center justify-center pl-12">
        <BoardViewMockup />
      </div>
    </div>
  );
}

// Slide 9: Financial Value
function SlideFinancialValue() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">Giá trị tài chính thật sự</p>
      
      <div className="flex gap-20 max-w-4xl mb-16">
        <div className="flex-1">
          <h2 className="text-2xl text-slate-400 mb-6">CEO không mua:</h2>
          <ul className="space-y-3 text-xl text-slate-500">
            <li>Giao diện</li>
            <li>Công nghệ</li>
            <li>AI buzzword</li>
          </ul>
        </div>
        
        <div className="flex-1">
          <h2 className="text-2xl text-white mb-6">CEO mua:</h2>
          <ul className="space-y-3 text-xl text-slate-200">
            <li>Giảm rủi ro quyết sai</li>
            <li>Giảm độ trễ quyết định</li>
            <li>Giảm phụ thuộc báo cáo thủ công</li>
            <li className="text-white font-medium">Tăng kiểm soát dòng tiền thật</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Slide 10: Decision Examples
function SlideExamples() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">Ví dụ quyết định điển hình</p>
      
      <div className="grid grid-cols-3 gap-8 max-w-5xl">
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-sm text-slate-500 mb-4">Ví dụ 1</p>
          <h3 className="text-lg text-white mb-4">Campaign tạo doanh thu nhưng đốt tiền</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-400">Marketing report: <span className="text-emerald-400">tốt</span></p>
            <p className="text-slate-400">Bluecore: <span className="text-amber-400">cash gap + AR kéo dài</span></p>
            <p className="text-white mt-4">→ Adjust hoặc Stop</p>
          </div>
        </div>
        
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-sm text-slate-500 mb-4">Ví dụ 2</p>
          <h3 className="text-lg text-white mb-4">SKU bán chạy nhưng xấu margin</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-400">Doanh thu: <span className="text-emerald-400">tăng</span></p>
            <p className="text-slate-400">Ops cost + return: <span className="text-amber-400">tăng</span></p>
            <p className="text-white mt-4">→ Điều chỉnh SKU mix</p>
          </div>
        </div>
        
        <div className="p-6 border border-slate-800 rounded-lg">
          <p className="text-sm text-slate-500 mb-4">Ví dụ 3</p>
          <h3 className="text-lg text-white mb-4">Tăng trưởng nhưng thiếu tiền mặt</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-400">Lợi nhuận kế toán: <span className="text-emerald-400">dương</span></p>
            <p className="text-slate-400">Dòng tiền: <span className="text-red-400">âm</span></p>
            <p className="text-white mt-4">→ Siết điều khoản / giảm tốc</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide 11: Why Hard to Copy
function SlideHardToCopy() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <h1 className="text-5xl font-bold text-white mb-4">
        Vì sao Bluecore khó bị copy
      </h1>
      
      <div className="my-16 max-w-3xl">
        <p className="text-xl text-slate-400 mb-8">Không phải UI. Không phải feature. Không phải thuật toán đơn lẻ.</p>
        
        <div className="space-y-6 pl-6 border-l-2 border-slate-700">
          <p className="text-2xl text-slate-200">Triết lý Decision-first</p>
          <p className="text-2xl text-slate-200">Kỷ luật tài chính xuyên hệ thống</p>
          <p className="text-2xl text-white font-medium">Cách đóng gói dữ liệu thành quyết định</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-lg text-slate-500">Copy giao diện thì dễ</p>
        <p className="text-lg text-white">Copy cách CEO tin dữ liệu thì rất khó</p>
      </div>
    </div>
  );
}

// Slide 12: When to Use
function SlideWhenToUse() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-8">Khi nào CEO nên dùng Bluecore</p>
      
      <div className="flex gap-20 max-w-4xl">
        <div className="flex-1">
          <h2 className="text-2xl text-white mb-6">Phù hợp khi:</h2>
          <ul className="space-y-3 text-xl text-slate-200">
            <li>✓ Doanh nghiệp đa kênh</li>
            <li>✓ Doanh thu tăng nhưng cash căng</li>
            <li>✓ CEO không tin các báo cáo hiện tại</li>
            <li>✓ Quyết định ngày càng đắt giá</li>
          </ul>
        </div>
        
        <div className="flex-1">
          <h2 className="text-2xl text-slate-400 mb-6">Không phù hợp nếu:</h2>
          <ul className="space-y-3 text-xl text-slate-500">
            <li>× Doanh nghiệp quá nhỏ</li>
            <li>× CEO thích xem dashboard hơn quyết định</li>
            <li>× Mục tiêu chỉ là báo cáo đẹp</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Slide 13: Closing
function SlideClosing() {
  return (
    <div className="flex flex-col justify-center items-center h-full px-20 text-center">
      <div className="max-w-3xl space-y-12">
        <div className="p-8 border border-slate-800 rounded-lg">
          <p className="text-2xl text-slate-400">
            "Bluecore không giúp anh/chị biết thêm.
          </p>
          <p className="text-2xl text-white font-medium mt-2">
            Bluecore giúp anh/chị dám quyết."
          </p>
        </div>
        
        <div>
          <p className="text-xl text-slate-400">
            CEO không thất bại vì thiếu dữ liệu.
          </p>
          <p className="text-xl text-white mt-2">
            CEO thất bại vì tin nhầm dữ liệu.
          </p>
        </div>
        
        <div className="pt-8 border-t border-slate-800">
          <p className="text-lg text-slate-500">
            Bluecore tồn tại để đảm bảo:
          </p>
          <p className="text-xl text-white mt-4">
            mỗi quyết định lớn đều dựa trên sự thật tài chính đã được kiểm chứng.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============== PRESENTER NOTES ==============

const presenterNotes: Record<number, { title: string; points: string[]; tips?: string }> = {
  0: {
    title: "Định vị ngay từ đầu",
    points: [
      "Nhấn mạnh: Bluecore KHÔNG bán phần mềm, bán năng lực ra quyết định",
      "Loại trừ ngay những người tìm Dashboard/BI/Marketing tool",
      "Đối tượng: CEO đã có dữ liệu nhưng không dám tin",
    ],
    tips: "Dừng lại để CEO tự nhận ra mình có đang ở tình huống này không"
  },
  1: {
    title: "CEO đang sống trong ảo giác",
    points: [
      "Vấn đề: Mỗi báo cáo đến từ hệ thống khác nhau",
      "Số liệu đúng cục bộ, sai khi ghép lại",
      "CEO nghe 'để em kiểm tra lại' thường xuyên",
    ],
    tips: "Hỏi CEO: 'Anh/chị có thường nghe câu này không?'"
  },
  2: {
    title: "Vấn đề thật sự",
    points: [
      "CEO có thừa công cụ (ERP, POS, OMS, Kế toán...)",
      "CEO thiếu: Sự thật thống nhất, Kết luận hành động, Nơi chịu trách nhiệm",
      "Kết luận: CEO đang kiểm soát bằng niềm tin mù",
    ],
    tips: "Đây là điểm đau chính - dừng lại cho CEO đồng cảm"
  },
  3: {
    title: "Dashboard trả lời câu hỏi sai",
    points: [
      "Dashboard chỉ trả lời 'Đã xảy ra gì?'",
      "CEO cần 'Tôi nên làm gì?' và 'Hậu quả tài chính thật?'",
      "Dashboard = quan sát, Decision System = hành động",
    ],
    tips: "So sánh trực tiếp để thấy sự khác biệt về mục đích"
  },
  4: {
    title: "BI làm CEO chậm hơn",
    points: [
      "BI cho drill-down, filters, custom views",
      "Nhưng CEO không có thời gian phân tích",
      "CEO muốn KẾT LUẬN đáng tin, không phải dữ liệu",
    ],
    tips: "Bluecore cố tình không cho drill-down trong demo CEO"
  },
  5: {
    title: "Bluecore giải quyết gì",
    points: [
      "Không thay thế ERP/BI/Kế toán/Marketing tools",
      "Đứng TRÊN tất cả để trả lời: Quyết định nào an toàn/nguy hiểm?",
      "Bluecore = Decision Layer",
    ],
    tips: "Không có 'xem cho biết', 'tham khảo', 'theo dõi'"
  },
  6: {
    title: "Decision Card - Đơn vị giá trị",
    points: [
      "Không liệt kê chỉ số, không đồ thị, không câu chuyện dài",
      "Đặt ra 1 quyết định + Rủi ro tài chính thật + 3 lựa chọn",
      "Cấu trúc: Statement → Evidence → Impact → Options",
    ],
    tips: "Chỉ vào mockup: Đây là cách CEO nhìn một quyết định"
  },
  7: {
    title: "Control Tower - Cách CEO dùng",
    points: [
      "Không KPI wall, không realtime spam số",
      "Chỉ trả lời: Hôm nay CEO cần quyết gì?",
      "Trải nghiệm: Mở → Thấy 3-5 cards → Quyết 30-60s → Đóng",
    ],
    tips: "Bluecore được thiết kế để CEO không ở lại lâu"
  },
  8: {
    title: "Board View - 30 giây",
    points: [
      "Chỉ 3 con số: Critical, Exposure, Time to Risk",
      "Không charts, không tables, không drill-down",
      "CEO đọc → biết → quyết",
    ],
    tips: "Đây là màn hình CEO thấy khi mở app mỗi sáng"
  },
  9: {
    title: "Giá trị tài chính thật sự",
    points: [
      "CEO không mua giao diện/công nghệ/AI buzzword",
      "CEO mua: Giảm rủi ro sai, Giảm độ trễ, Giảm phụ thuộc",
      "Quan trọng nhất: Tăng kiểm soát dòng tiền thật",
    ],
    tips: "Đây là lúc nói về ROI và giá trị kinh doanh"
  },
  10: {
    title: "Ví dụ điển hình",
    points: [
      "Campaign tốt (marketing) nhưng đốt tiền (Bluecore thấy cash gap)",
      "SKU bán chạy nhưng xấu margin (ops cost + return tăng)",
      "Tăng trưởng nhưng thiếu cash (lợi nhuận kế toán dương, dòng tiền âm)",
    ],
    tips: "CEO nào cũng từng gặp ít nhất 1 trong 3 tình huống này"
  },
  11: {
    title: "Khó bị copy",
    points: [
      "Không phải UI, feature, hay thuật toán đơn lẻ",
      "Khó copy: Triết lý Decision-first, Kỷ luật tài chính xuyên hệ thống",
      "Copy giao diện dễ, copy cách CEO tin dữ liệu rất khó",
    ],
    tips: "Đây là competitive moat - nói tự tin"
  },
  12: {
    title: "Khi nào nên dùng",
    points: [
      "Phù hợp: Đa kênh, cash căng, không tin báo cáo, quyết định đắt",
      "Không phù hợp: Quá nhỏ, thích dashboard, chỉ cần báo cáo đẹp",
      "Tự disqualify để tăng độ tin cậy",
    ],
    tips: "Cho CEO tự đánh giá mình có phù hợp không"
  },
  13: {
    title: "Câu chốt",
    points: [
      "'Bluecore không giúp biết thêm, giúp dám quyết'",
      "'CEO thất bại vì tin nhầm dữ liệu'",
      "'Mỗi quyết định lớn dựa trên sự thật tài chính đã kiểm chứng'",
    ],
    tips: "Im lặng sau câu cuối - để CEO tự cảm nhận"
  },
};

// ============== MAIN COMPONENT ==============

export default function MDPSalesDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(true);
  
  const slides = [
    { id: 0, component: SlidePositioning, label: 'Định vị' },
    { id: 1, component: SlideCEOReality, label: 'Ảo giác kiểm soát' },
    { id: 2, component: SlideRealProblem, label: 'Vấn đề thật' },
    { id: 3, component: SlideDashboardFails, label: 'Dashboard thất bại' },
    { id: 4, component: SlideBISlower, label: 'BI làm chậm' },
    { id: 5, component: SlideWhatBluecore, label: 'Bluecore giải quyết' },
    { id: 6, component: SlideDecisionCard, label: 'Decision Card' },
    { id: 7, component: SlideControlTower, label: 'Control Tower' },
    { id: 8, component: SlideBoardView, label: 'Board View' },
    { id: 9, component: SlideFinancialValue, label: 'Giá trị tài chính' },
    { id: 10, component: SlideExamples, label: 'Ví dụ' },
    { id: 11, component: SlideHardToCopy, label: 'Khó copy' },
    { id: 12, component: SlideWhenToUse, label: 'Khi nào dùng' },
    { id: 13, component: SlideClosing, label: 'Chốt' },
  ];
  
  const goToPrev = () => setCurrentSlide(prev => Math.max(0, prev - 1));
  const goToNext = () => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
  
  // Keyboard navigation
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
        {/* Slide Content */}
        <div className="flex-1 overflow-hidden">
          <CurrentSlideComponent />
        </div>
        
        {/* Navigation Footer */}
        <div className="h-14 border-t border-slate-800 flex items-center justify-between px-6">
          {/* Slide Indicator */}
          <div className="flex items-center gap-1">
            {slides.map((slide, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                title={slide.label}
                className={cn(
                  "h-1 rounded-full transition-all",
                  idx === currentSlide 
                    ? "bg-white w-6" 
                    : "bg-slate-700 hover:bg-slate-600 w-1"
                )}
              />
            ))}
          </div>
          
          {/* Slide Info */}
          <div className="text-center">
            <span className="text-sm text-slate-500 font-mono">
              {currentSlide + 1} / {slides.length}
            </span>
            <span className="text-sm text-slate-600 ml-3">
              {slides[currentSlide].label}
            </span>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotes(prev => !prev)}
              className={cn(
                "p-2 rounded transition-colors",
                showNotes ? "text-white bg-slate-800" : "text-slate-500 hover:text-white hover:bg-slate-800"
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
                      <li key={idx} className="text-sm text-slate-300 pl-3 border-l-2 border-slate-700">
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
