import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BLUECORE MDP SALES DECK - CEO VERSION
 * 
 * Design Philosophy:
 * - Executive, calm, high-trust
 * - No excitement, no hype
 * - Typography > decoration
 * - Optimize for authority and trust
 */

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

// Slide 6: Decision Card
function SlideDecisionCard() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">Đơn vị giá trị cốt lõi</p>
      <h1 className="text-4xl font-bold text-white mb-12">
        Decision Card không phải report
      </h1>
      
      <div className="flex gap-12 max-w-5xl">
        <div className="flex-1">
          <p className="text-lg text-slate-400 mb-4">Decision Card không:</p>
          <ul className="space-y-2 text-lg text-slate-500">
            <li>× Liệt kê chỉ số</li>
            <li>× Kể câu chuyện dài</li>
            <li>× Thuyết phục bằng đồ thị</li>
          </ul>
        </div>
        
        <div className="flex-1">
          <p className="text-lg text-white mb-4">Decision Card:</p>
          <ul className="space-y-2 text-lg text-slate-200">
            <li>✓ Đặt ra 1 quyết định</li>
            <li>✓ Chỉ ra rủi ro tài chính thật</li>
            <li>✓ Đưa ra 3 lựa chọn quản trị</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-12 p-6 border border-slate-700 rounded-lg bg-slate-900/50 max-w-2xl">
        <p className="text-sm text-slate-500 uppercase tracking-widest mb-4">Cấu trúc chuẩn</p>
        <div className="space-y-3 text-lg">
          <p className="text-white">1. Decision statement</p>
          <p className="text-slate-300">2. Evidence đã reconcile (Finance – Ops – Marketing)</p>
          <p className="text-slate-300">3. Financial impact thật (Cash, margin, AR/AP)</p>
          <p className="text-slate-300">4. Action options: Continue / Adjust / Stop</p>
        </div>
      </div>
    </div>
  );
}

// Slide 7: Control Tower Experience
function SlideControlTower() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">Cách CEO sử dụng Bluecore</p>
      
      <h1 className="text-4xl font-bold text-white mb-4">
        Control Tower chỉ làm 1 việc
      </h1>
      <h2 className="text-4xl font-bold text-slate-400 mb-16">
        "Hôm nay CEO cần quyết gì?"
      </h2>
      
      <div className="max-w-2xl mb-12">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-6">Trải nghiệm CEO lý tưởng</p>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-slate-600 font-mono">01</span>
            <span className="text-xl text-slate-300">Mở Bluecore</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-600 font-mono">02</span>
            <span className="text-xl text-slate-300">Thấy 3–5 Decision Cards</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-600 font-mono">03</span>
            <span className="text-xl text-slate-300">Click 1 card</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-600 font-mono">04</span>
            <span className="text-xl text-white font-medium">Quyết trong 30–60 giây</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-600 font-mono">05</span>
            <span className="text-xl text-slate-300">Đóng lại</span>
          </div>
        </div>
      </div>
      
      <p className="text-lg text-slate-500 pl-6 border-l-2 border-slate-700">
        Bluecore được thiết kế để CEO không ở lại lâu.
      </p>
    </div>
  );
}

// Slide 8: Financial Value
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

// Slide 9: Decision Examples
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

// Slide 10: Why Hard to Copy
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

// Slide 11: When to Use
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

// Slide 12: Closing
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

// Main Deck Component
export default function MDPSalesDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    { id: 0, component: SlidePositioning, label: 'Định vị' },
    { id: 1, component: SlideCEOReality, label: 'Ảo giác kiểm soát' },
    { id: 2, component: SlideRealProblem, label: 'Vấn đề thật' },
    { id: 3, component: SlideDashboardFails, label: 'Dashboard thất bại' },
    { id: 4, component: SlideBISlower, label: 'BI làm chậm' },
    { id: 5, component: SlideWhatBluecore, label: 'Bluecore giải quyết' },
    { id: 6, component: SlideDecisionCard, label: 'Decision Card' },
    { id: 7, component: SlideControlTower, label: 'Control Tower' },
    { id: 8, component: SlideFinancialValue, label: 'Giá trị tài chính' },
    { id: 9, component: SlideExamples, label: 'Ví dụ' },
    { id: 10, component: SlideHardToCopy, label: 'Khó copy' },
    { id: 11, component: SlideWhenToUse, label: 'Khi nào dùng' },
    { id: 12, component: SlideClosing, label: 'Chốt' },
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
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const CurrentSlideComponent = slides[currentSlide].component;
  
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col">
      {/* Slide Content */}
      <div className="flex-1 overflow-hidden">
        <CurrentSlideComponent />
      </div>
      
      {/* Navigation Footer */}
      <div className="h-16 border-t border-slate-800 flex items-center justify-between px-8">
        {/* Slide Indicator */}
        <div className="flex items-center gap-1.5">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              title={slide.label}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === currentSlide 
                  ? "bg-white w-8" 
                  : "bg-slate-700 hover:bg-slate-600 w-1.5"
              )}
            />
          ))}
        </div>
        
        {/* Slide Info */}
        <div className="text-center">
          <span className="text-sm text-slate-500 font-mono">
            {currentSlide + 1} / {slides.length}
          </span>
          <span className="text-sm text-slate-600 ml-4">
            {slides[currentSlide].label}
          </span>
        </div>
        
        {/* Navigation Arrows */}
        <div className="flex items-center gap-2">
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
  );
}
