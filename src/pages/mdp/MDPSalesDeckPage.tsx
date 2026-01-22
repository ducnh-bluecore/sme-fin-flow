import { useState } from 'react';
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
 * 
 * Visual Rules:
 * - Dark charcoal background
 * - White/light gray text
 * - Single subtle accent
 * - No gradients, no icons, no illustrations
 */

// Slide Components
function SlideCover() {
  return (
    <div className="flex flex-col justify-center items-start h-full px-20">
      <h1 className="text-7xl font-bold text-white tracking-tight mb-6">
        Bluecore MDP
      </h1>
      <h2 className="text-3xl font-light text-slate-300 mb-16">
        Decision System for CEOs
      </h2>
      <div className="space-y-2">
        <p className="text-lg text-slate-500">
          Ra quyết định dựa trên sự thật tài chính thời gian thực
        </p>
        <p className="text-lg text-slate-500">
          Không dashboard. Không báo cáo trễ.
        </p>
      </div>
    </div>
  );
}

function SlidePain() {
  return (
    <div className="flex h-full px-20 py-16">
      {/* Left - Title */}
      <div className="w-1/2 flex flex-col justify-center pr-12">
        <h1 className="text-5xl font-bold text-white leading-tight">
          CEO không thiếu dữ liệu
        </h1>
        <h2 className="text-5xl font-bold text-slate-400 mt-2">
          CEO thiếu niềm tin để quyết
        </h2>
      </div>
      
      {/* Right - Bullets */}
      <div className="w-1/2 flex flex-col justify-center pl-12 border-l border-slate-800">
        <ul className="space-y-6">
          <li className="text-xl text-slate-300">
            Báo cáo đúng nhưng là quá khứ
          </li>
          <li className="text-xl text-slate-300">
            Marketing – Ops – Finance mỗi bên một con số
          </li>
          <li className="text-xl text-slate-300">
            Quyết định lớn → phải hỏi lại nhiều phòng ban
          </li>
          <li className="text-xl text-slate-300">
            Quyết chậm = mất tiền / mất cơ hội
          </li>
        </ul>
      </div>
    </div>
  );
}

function SlideProblem() {
  return (
    <div className="flex flex-col justify-center items-center h-full px-20 text-center">
      <h1 className="text-4xl font-bold text-slate-400 mb-16">
        Dashboard không giúp CEO ra quyết định
      </h1>
      
      <div className="max-w-4xl space-y-4 mb-20">
        <p className="text-5xl font-bold text-white leading-tight">
          CEO không cần thêm số liệu
        </p>
        <p className="text-5xl font-bold text-white leading-tight">
          CEO cần kết luận có thể hành động
        </p>
      </div>
      
      <div className="space-y-2">
        <p className="text-lg text-slate-500">
          Báo cáo trả lời "đã xảy ra gì"
        </p>
        <p className="text-lg text-slate-500">
          Quyết định cần trả lời "nên làm gì"
        </p>
      </div>
    </div>
  );
}

function SlideWhatIs() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <div className="mb-20">
        <h1 className="text-4xl font-bold text-white leading-tight">
          Bluecore không hiển thị dữ liệu
        </h1>
        <h2 className="text-4xl font-bold text-slate-400 mt-2">
          Bluecore chịu trách nhiệm cho quyết định
        </h2>
      </div>
      
      <div className="space-y-10 max-w-3xl">
        <div className="flex items-start gap-8">
          <span className="text-2xl font-light text-slate-600">01</span>
          <p className="text-2xl text-slate-200">
            Dữ liệu đã reconcile (Finance – Ops – Marketing)
          </p>
        </div>
        <div className="flex items-start gap-8">
          <span className="text-2xl font-light text-slate-600">02</span>
          <p className="text-2xl text-slate-200">
            Mọi insight được đóng gói thành Decision Cards
          </p>
        </div>
        <div className="flex items-start gap-8">
          <span className="text-2xl font-light text-slate-600">03</span>
          <p className="text-2xl text-slate-200">
            Mỗi Decision Card = Go / Stop / Adjust
          </p>
        </div>
      </div>
    </div>
  );
}

function SlideDecisionCard() {
  return (
    <div className="flex flex-col justify-center h-full px-20">
      <h1 className="text-3xl font-bold text-slate-400 mb-12">
        Một quyết định – nhìn trong 30 giây
      </h1>
      
      {/* Decision Card Mock */}
      <div className="max-w-2xl mb-16">
        <div className="border border-slate-700 rounded-lg p-8 bg-slate-900/50">
          <p className="text-sm text-slate-500 uppercase tracking-widest mb-4">
            Decision Card
          </p>
          <h2 className="text-2xl font-semibold text-white mb-8">
            Có nên tiếp tục Campaign A?
          </h2>
          
          <div className="space-y-3 text-lg">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">↑</span>
              <span className="text-slate-300">Revenue</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-red-400">↓</span>
              <span className="text-slate-300">Margin thật</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-400">→</span>
              <span className="text-slate-300">AR kéo dài</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-red-400">↓</span>
              <span className="text-slate-300">Inventory bị khóa</span>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <span className="text-red-400 font-medium">Cash gap xuất hiện sau 21 ngày</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* CEO Insight Quote */}
      <div className="max-w-2xl space-y-2 pl-6 border-l-2 border-slate-700">
        <p className="text-xl text-slate-400 italic">
          "Nếu chỉ nhìn báo cáo marketing, đây là campaign tốt"
        </p>
        <p className="text-xl text-white font-medium">
          "Nhưng với Bluecore, đây là quyết định nguy hiểm"
        </p>
      </div>
    </div>
  );
}

function SlideClose() {
  return (
    <div className="flex flex-col justify-center items-start h-full px-20">
      <div className="mb-20">
        <h1 className="text-6xl font-bold text-white leading-tight">
          CEO quyết nhanh
        </h1>
        <h2 className="text-6xl font-bold text-slate-400 mt-2">
          khi tin dữ liệu
        </h2>
      </div>
      
      <div className="max-w-3xl space-y-4">
        <p className="text-xl text-slate-400">
          Bluecore không thay CEO ra quyết định
        </p>
        <p className="text-xl text-slate-300">
          Bluecore đảm bảo CEO không ra quyết định sai vì dữ liệu sai
        </p>
      </div>
    </div>
  );
}

// Main Deck Component
export default function MDPSalesDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    { id: 1, component: SlideCover },
    { id: 2, component: SlidePain },
    { id: 3, component: SlideProblem },
    { id: 4, component: SlideWhatIs },
    { id: 5, component: SlideDecisionCard },
    { id: 6, component: SlideClose },
  ];
  
  const goToPrev = () => setCurrentSlide(prev => Math.max(0, prev - 1));
  const goToNext = () => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
  
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
        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                idx === currentSlide 
                  ? "bg-white w-6" 
                  : "bg-slate-700 hover:bg-slate-600"
              )}
            />
          ))}
        </div>
        
        {/* Slide Number */}
        <span className="text-sm text-slate-500 font-mono">
          {currentSlide + 1} / {slides.length}
        </span>
        
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
