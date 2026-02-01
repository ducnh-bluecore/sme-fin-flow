/**
 * VC Pitch Deck - Vietnamese Version
 * 
 * 12-slide interactive presentation for Series A investors
 * Focus: Category claim, not product demo
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight,
  MessageSquareText,
  Globe,
  X,
  FileDown,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sanitizePdfElement, sanitizePdfElementHard } from '@/components/sales-deck/pdfStyleSanitizer';
import VCPitchDeckPDF_VI from '@/components/sales-deck/VCPitchDeckPDF_VI';

// Presenter notes for each slide (Vietnamese)
const presenterNotes: Record<number, { tip: string; action: string }> = {
  1: {
    tip: "Chúng tôi không xây dashboard tốt hơn. Chúng tôi xây hệ thống mà CEO dựa vào để hiểu sự thật tài chính — mỗi sáng.",
    action: "Dừng. Để câu nói thấm."
  },
  2: {
    tip: "VC đầu tư vào các xu hướng lớn. Họ không đầu tư vào công cụ. Định vị Bluecore như phản ứng với macro shift.",
    action: "Nhấn mạnh: độ trễ quyết định = rủi ro sống còn."
  },
  3: {
    tip: "Đội ngũ lãnh đạo vẫn vận hành mà không có hệ thống được thiết kế để trả lời: 'Chúng ta có an toàn về tài chính ngay bây giờ không?'",
    action: "Chỉ vào tầng bị thiếu trong sơ đồ."
  },
  4: {
    tip: "Nhận thức tài chính không phải là một tính năng. Nó là một tầng kiến trúc.",
    action: "Để định nghĩa này thấm. Đừng giải thích quá nhiều."
  },
  5: {
    tip: "Người chiến thắng trong thập kỷ tới sẽ không giàu dữ liệu. Họ sẽ giàu nhận thức.",
    action: "Đây là ngôn ngữ VC. Sử dụng nó."
  },
  6: {
    tip: "Series A = câu chuyện kiến trúc, không phải demo UI. Cho thấy tầng kiểm soát, không phải các nút bấm.",
    action: "Đi qua luồng từ dữ liệu đến cảnh báo."
  },
  7: {
    tip: "Trả lời 'Tại sao không thể sao chép?' trước khi họ hỏi. Đây là bài toán hệ thống sâu.",
    action: "Nhấn mạnh: Đây không phải phần mềm bạn lắp ráp. Đây là phần mềm bạn kiến trúc."
  },
  8: {
    tip: "Bạn không cần ARR khổng lồ. Bạn cần tín hiệu đúng: retention, độ sâu sử dụng, sự phụ thuộc quyết định.",
    action: "CEO mở Bluecore hàng ngày. Không phải hàng tháng."
  },
  9: {
    tip: "Đừng pitch retail analytics. Pitch thị trường control-layer ngang bắt đầu từ wedge dọc.",
    action: "Bắt đầu hẹp, mở rộng ngang."
  },
  10: {
    tip: "Doanh nghiệp không thay đổi hệ thống mà họ tin tưởng để nói cho họ sự thật.",
    action: "Đi qua cả 4 tầng moat."
  },
  11: {
    tip: "Điều hành công ty mà không có nhận thức tài chính sẽ sớm cảm thấy liều lĩnh như điều hành công ty mà không có kế toán.",
    action: "Vẽ tương lai. Làm cho nó trở nên tất yếu."
  },
  12: {
    tip: "Chúng tôi không xây công cụ. Chúng tôi xây hệ thống mà doanh nghiệp dựa vào để tồn tại.",
    action: "Dừng. Kết thúc deck. Để sự im lặng làm việc."
  }
};

// Slide components (Vietnamese)
const Slide01CategoryClaim: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight"
    >
      Tầng Nhận thức Tài chính<br />
      <span className="text-blue-400">cho Thương mại Hiện đại.</span>
    </motion.h1>
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.8 }}
      className="max-w-3xl"
    >
      <p className="text-2xl md:text-3xl font-light text-slate-300 mb-4">
        Mọi doanh nghiệp đều vận hành trên hệ thống ghi nhận.
      </p>
      <p className="text-2xl md:text-3xl font-light text-slate-300">
        Thế hệ tiếp theo sẽ vận hành trên <span className="text-blue-400 font-medium">hệ thống nhận thức.</span>
      </p>
    </motion.div>
  </div>
);

const Slide02InevitableShift: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
    >
      Doanh nghiệp không thất bại vì thiếu dữ liệu.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-amber-400 mb-12"
    >
      Họ thất bại vì sự thật tài chính đến muộn.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl"
    >
      <div className="text-left p-6 rounded-xl bg-slate-800/50 border border-slate-700">
        <h3 className="text-amber-400 text-xl font-semibold mb-4">Thế giới cũ</h3>
        <ul className="space-y-3 text-slate-300 text-lg">
          <li>• Đóng sổ hàng tháng</li>
          <li>• Review hàng quý</li>
          <li>• Quyết định phản ứng</li>
        </ul>
      </div>
      <div className="text-left p-6 rounded-xl bg-slate-800/50 border border-blue-500/30">
        <h3 className="text-blue-400 text-xl font-semibold mb-4">Thế giới mới</h3>
        <ul className="space-y-3 text-slate-300 text-lg">
          <li>• Biên lợi nhuận bị nén</li>
          <li>• Nhu cầu biến động</li>
          <li>• CAC tăng cao</li>
        </ul>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="mt-12 text-xl md:text-2xl text-slate-400 italic border-l-4 border-blue-500 pl-6"
    >
      Độ trễ quyết định = Rủi ro sống còn.
    </motion.p>
  </div>
);

const Slide03BrokenStack: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-12"
    >
      Data Stack hiện đại không được xây<br />
      <span className="text-amber-400">cho người ra quyết định.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="font-mono text-sm md:text-base bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-3xl w-full"
    >
      <div className="flex items-center justify-center gap-4 text-slate-300 mb-6">
        <span className="px-4 py-2 bg-slate-800 rounded">ERP</span>
        <span className="text-slate-500">→</span>
        <span className="px-4 py-2 bg-slate-800 rounded">CRM</span>
        <span className="text-slate-500">→</span>
        <span className="px-4 py-2 bg-slate-800 rounded">BI</span>
        <span className="text-slate-500">→</span>
        <span className="px-4 py-2 bg-slate-800 rounded">Analytics</span>
      </div>
      <div className="text-slate-500 text-2xl mb-4">↓</div>
      <div className="text-slate-400 mb-8">
        <div>Operators</div>
        <div>Analysts</div>
      </div>
      <div className="border-t-4 border-b-4 border-blue-500 py-4 my-4">
        <div className="text-blue-400 font-bold text-lg">TẦNG BỊ THIẾU</div>
        <div className="text-white font-bold text-xl mt-2">NHẬN THỨC ĐIỀU HÀNH</div>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="mt-10 text-xl text-slate-400 italic border-l-4 border-blue-500 pl-6 max-w-2xl"
    >
      Đội ngũ lãnh đạo vẫn vận hành mà không có hệ thống được thiết kế để trả lời:<br />
      <span className="text-white font-medium">"Chúng ta có an toàn về tài chính ngay bây giờ không?"</span>
    </motion.p>
  </div>
);

const Slide04IntroducingCategory: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-8"
    >
      <span className="text-blue-400 text-xl font-medium tracking-wider uppercase">Giới thiệu</span>
    </motion.div>
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8"
    >
      Bluecore là<br />
      <span className="text-blue-400">Hệ điều hành Quyết định Tài chính.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="text-xl md:text-2xl text-slate-300 max-w-3xl font-light"
    >
      Một hệ thống chuyển đổi các tín hiệu tài chính phân tán thành nhận thức điều hành thời gian thực — cho phép ra quyết định nhanh hơn, an toàn hơn.
    </motion.p>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-12 text-xl text-slate-400 italic border-l-4 border-blue-500 pl-6"
    >
      Nhận thức tài chính không phải là một tính năng.<br />
      <span className="text-white">Nó là một tầng kiến trúc.</span>
    </motion.p>
  </div>
);

const Slide05WhyNow: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-5xl md:text-6xl font-bold text-white mb-4"
    >
      Kỷ nguyên Nhận thức
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-emerald-400 mb-12"
    >
      Đã Bắt đầu.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full"
    >
      {[
        { num: "1", title: "Dữ liệu tài chính cuối cùng đã có thể truy cập", desc: "APIs, marketplaces, payments" },
        { num: "2", title: "Cửa sổ quyết định đang thu hẹp", desc: "Tuần, không phải quý" },
        { num: "3", title: "Biên sai số đang biến mất", desc: "Mọi quyết định đều quan trọng" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 text-left"
        >
          <div className="text-blue-400 text-4xl font-bold mb-4">{item.num}</div>
          <h3 className="text-white text-lg font-semibold mb-2">{item.title}</h3>
          <p className="text-slate-400">{item.desc}</p>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-12 text-xl text-slate-400 italic border-l-4 border-emerald-500 pl-6"
    >
      Người chiến thắng trong thập kỷ tới sẽ không giàu dữ liệu.<br />
      <span className="text-white">Họ sẽ giàu nhận thức.</span>
    </motion.p>
  </div>
);

const Slide06ProductInfrastructure: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-12"
    >
      Tầng kiểm soát cho<br />
      <span className="text-blue-400">Sự thật Tài chính.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center gap-4 max-w-md"
    >
      {[
        { label: "Nguồn dữ liệu", color: "slate" },
        { label: "Sự thật tài chính thống nhất", color: "blue" },
        { label: "Công cụ quyết định", color: "blue" },
        { label: "Cảnh báo điều hành", color: "emerald" }
      ].map((item, i) => (
        <React.Fragment key={i}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.15 }}
            className={cn(
              "w-full py-4 px-8 rounded-lg text-center font-medium text-lg",
              item.color === "slate" && "bg-slate-700 text-slate-200",
              item.color === "blue" && "bg-blue-500/20 text-blue-400 border border-blue-500/40",
              item.color === "emerald" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            )}
          >
            {item.label}
          </motion.div>
          {i < 3 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="text-slate-500 text-2xl"
            >
              ↓
            </motion.div>
          )}
        </React.Fragment>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="mt-12 text-lg text-slate-500 italic"
    >
      Series A = Câu chuyện kiến trúc. Không phải demo UI.
    </motion.p>
  </div>
);

const Slide07WhatMakesHard: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-12"
    >
      Nhận thức Tài chính là<br />
      <span className="text-amber-400">Bài toán Hệ thống Sâu.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full"
    >
      {[
        "Ngữ nghĩa tài chính",
        "Logic đối soát",
        "Chuẩn hóa lợi nhuận",
        "Mô hình quyết định"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.1 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-slate-700"
        >
          <span className="text-slate-300 font-medium">{item}</span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-8 text-slate-500 text-lg"
    >
      👉 Không phải dashboards.
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-10 text-xl text-slate-400 italic border-l-4 border-amber-500 pl-6"
    >
      Đây không phải phần mềm bạn lắp ráp.<br />
      <span className="text-white">Đây là phần mềm bạn kiến trúc.</span>
    </motion.p>
  </div>
);

const Slide08EarlySignal: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Khi Lãnh đạo Tin tưởng Hệ thống —
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-emerald-400 mb-12"
    >
      Nó trở thành Sống còn.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full"
    >
      {[
        { metric: "Retention", signal: "Cao" },
        { metric: "Độ sâu sử dụng", signal: "Hàng ngày" },
        { metric: "Phụ thuộc quyết định", signal: "Quan trọng" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="p-6 rounded-xl bg-slate-800/50 border border-emerald-500/30"
        >
          <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">{item.metric}</div>
          <div className="text-emerald-400 text-2xl font-bold">{item.signal}</div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-12 text-xl text-slate-400 italic border-l-4 border-emerald-500 pl-6"
    >
      CEO mở Bluecore hàng ngày.<br />
      <span className="text-white">Không phải hàng tháng.</span>
    </motion.p>
  </div>
);

const Slide09Market: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-12"
    >
      Mọi doanh nghiệp nhạy cảm với Margin sẽ cần<br />
      <span className="text-blue-400">một Tầng Nhận thức Tài chính.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center gap-6 max-w-2xl w-full"
    >
      <div className="w-full">
        <div className="text-slate-500 text-sm uppercase tracking-wider mb-2">Bắt đầu hẹp</div>
        <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg py-3 px-6 text-blue-400 font-medium">
          Retail / Ecommerce
        </div>
      </div>
      <div className="text-slate-500 text-2xl">↓</div>
      <div className="w-full">
        <div className="text-slate-500 text-sm uppercase tracking-wider mb-2">Mở rộng</div>
        <div className="grid grid-cols-3 gap-3">
          {["Multi-brand", "Consumer", "Marketplaces"].map((item, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg py-3 px-4 text-slate-300 text-sm">
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="text-slate-500 text-2xl">↓</div>
      <div className="w-full">
        <div className="text-slate-500 text-sm uppercase tracking-wider mb-2">Mid-market</div>
        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-lg py-3 px-6 text-emerald-400 font-medium">
          Tất cả Doanh nghiệp Nhạy cảm với Margin
        </div>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-10 text-lg text-slate-400 italic border-l-4 border-blue-500 pl-6"
    >
      Chúng tôi đang bước vào thị trường control-layer ngang —<br />
      <span className="text-white">bắt đầu với wedge dọc.</span>
    </motion.p>
  </div>
);

const Slide10Moat: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-5xl md:text-6xl font-bold text-white mb-4"
    >
      Nhận thức
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-5xl md:text-6xl font-bold text-blue-400 mb-12"
    >
      Cộng hưởng.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col gap-2 max-w-xl w-full"
    >
      {[
        { num: 1, label: "Chuẩn Ngữ nghĩa", desc: "Ngôn ngữ tài chính thống nhất" },
        { num: 2, label: "Bộ dữ liệu Quyết định", desc: "Các pattern lịch sử" },
        { num: 3, label: "Niềm tin Tổ chức", desc: "Nguồn sự thật duy nhất" },
        { num: 4, label: "Lock-in Quy trình Điều hành", desc: "Thói quen hàng ngày" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-left"
        >
          <div className="text-blue-400 text-2xl font-bold w-8">{item.num}</div>
          <div>
            <div className="text-white font-medium">{item.label}</div>
            <div className="text-slate-500 text-sm">{item.desc}</div>
          </div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="mt-10 text-xl text-slate-400 italic border-l-4 border-blue-500 pl-6"
    >
      Doanh nghiệp không thay đổi hệ thống<br />
      <span className="text-white">mà họ tin tưởng để nói cho họ sự thật.</span>
    </motion.p>
  </div>
);

const Slide11VisionScale: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Chúng tôi tin Nhận thức Tài chính
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Sẽ trở thành Hạ tầng Mặc định.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl w-full"
    >
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 text-left">
        <div className="text-amber-400 text-sm uppercase tracking-wider mb-3">Hôm nay</div>
        <div className="text-white text-xl font-medium">ERP là bắt buộc</div>
        <div className="text-slate-500 mt-2">Mọi công ty đều có</div>
      </div>
      <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/40 text-left">
        <div className="text-blue-400 text-sm uppercase tracking-wider mb-3">Ngày mai</div>
        <div className="text-white text-xl font-medium">Nhận thức là bắt buộc</div>
        <div className="text-slate-400 mt-2">Mọi công ty sẽ cần</div>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-12 text-xl text-slate-400 italic border-l-4 border-blue-500 pl-6 max-w-2xl"
    >
      Điều hành công ty mà không có nhận thức tài chính sẽ sớm cảm thấy liều lĩnh<br />
      <span className="text-white">như điều hành công ty mà không có kế toán.</span>
    </motion.p>
  </div>
);

const Slide12CompanyBuilding: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8"
    >
      Bluecore đang xây dựng<br />
      <span className="text-blue-400">Tầng kiểm soát Tài chính</span><br />
      cho Thương mại.
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="max-w-2xl"
    >
      <p className="text-xl text-slate-300 mb-8">Khi Bluecore chiến thắng:</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          "CEO bắt đầu ngày mới với nó",
          "Boards tin tưởng nó",
          "Operators tuân theo nó"
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.15 }}
            className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300"
          >
            {item}
          </motion.div>
        ))}
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-12 text-2xl text-slate-300 font-light"
    >
      Chúng tôi không xây công cụ.
    </motion.p>
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.3 }}
      className="mt-2 text-2xl text-white font-medium"
    >
      Chúng tôi xây hệ thống mà doanh nghiệp dựa vào để tồn tại.
    </motion.p>
  </div>
);

const slides = [
  Slide01CategoryClaim,
  Slide02InevitableShift,
  Slide03BrokenStack,
  Slide04IntroducingCategory,
  Slide05WhyNow,
  Slide06ProductInfrastructure,
  Slide07WhatMakesHard,
  Slide08EarlySignal,
  Slide09Market,
  Slide10Moat,
  Slide11VisionScale,
  Slide12CompanyBuilding
];

const VCPitchDeckVI: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  }, []);
  
  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);
  
  const toggleNotes = useCallback(() => {
    setShowNotes(prev => !prev);
  }, []);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    toast.info('Đang tạo PDF...', {
      description: 'Vui lòng đợi trong giây lát',
    });

    try {
      const pdfComponent = <VCPitchDeckPDF_VI />;
      let blob: Blob;
      try {
        blob = await pdf(sanitizePdfElement(pdfComponent)).toBlob();
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        const isBorderCrash = /Invalid border width/i.test(err.message);
        if (!isBorderCrash) throw e;
        console.warn('[VCPitchDeckVI] Retrying PDF generation with border-stripped sanitizer');
        blob = await pdf(sanitizePdfElementHard(sanitizePdfElement(pdfComponent))).toBlob();
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Bluecore_VC_Pitch_Deck_VI.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Tải xuống thành công!', {
        description: 'Bluecore_VC_Pitch_Deck_VI.pdf',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Lỗi tạo PDF', {
        description: 'Vui lòng thử lại sau',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
      if (e.key === 'n' || e.key === 'N') {
        toggleNotes();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, toggleNotes]);
  
  const CurrentSlideComponent = slides[currentSlide];
  
  return (
    <>
      <Helmet>
        <title>VC Pitch Deck | Bluecore</title>
      </Helmet>
      
      <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
        {/* Top Navigation */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4">
          <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
            <Link to="/portal">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại Portal
            </Link>
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">
              {currentSlide + 1} / {slides.length}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <Link to="/investor/vc-pitch">
                <Globe className="mr-2 h-4 w-4" />
                EN
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleNotes}
              className={cn(
                "text-slate-400 hover:text-white hover:bg-slate-800",
                showNotes && "text-blue-400 bg-slate-800"
              )}
            >
              <MessageSquareText className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Main Slide Area */}
        <div 
          className="min-h-screen flex items-center justify-center cursor-pointer"
          onClick={nextSlide}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-screen flex items-center justify-center"
            >
              <CurrentSlideComponent />
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Navigation Arrows */}
        <div className="fixed bottom-1/2 left-4 transform translate-y-1/2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            disabled={currentSlide === 0}
            className="text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        </div>
        <div className="fixed bottom-1/2 right-4 transform translate-y-1/2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            disabled={currentSlide === slides.length - 1}
            className="text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
        
        {/* Progress Dots */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(i); }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === currentSlide ? "bg-blue-400 w-6" : "bg-slate-600 hover:bg-slate-500"
              )}
            />
          ))}
        </div>
        
        {/* Presenter Notes Panel */}
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 p-6 overflow-y-auto z-40"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Ghi chú Trình bày</h3>
                <Button variant="ghost" size="icon" onClick={toggleNotes} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="text-blue-400 text-sm font-medium mb-2">Founder Tip</div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {presenterNotes[currentSlide + 1]?.tip}
                  </p>
                </div>
                <div>
                  <div className="text-emerald-400 text-sm font-medium mb-2">Hành động</div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {presenterNotes[currentSlide + 1]?.action}
                  </p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-700">
                <div className="text-slate-500 text-xs">
                  Nhấn <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">N</kbd> để bật/tắt ghi chú
                </div>
                <div className="text-slate-500 text-xs mt-1">
                  Dùng <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">→</kbd> để điều hướng
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default VCPitchDeckVI;
