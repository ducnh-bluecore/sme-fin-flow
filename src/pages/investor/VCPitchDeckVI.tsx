/**
 * VC Pitch Deck - Vietnamese Version
 * 
 * 18-slide interactive presentation for Series A investors
 * Focus: Category claim - Financial Decision Infrastructure
 * Structure: 7 Acts
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
    tip: "Partner ngay lập tức cảm nhận vấn đề mang tính hệ thống, không phải thiếu tính năng. Startup tốt sửa vấn đề. Startup vĩ đại sửa structural shifts.",
    action: "Dừng. Để nó thấm. Nghe tất yếu, không phải hào hứng."
  },
  2: {
    tip: "Đây là positioning ELITE. Giữ slide này. Nó đóng khung mọi thứ.",
    action: "Partner nghĩ: 'Nghe có vẻ lớn.'"
  },
  3: {
    tip: "Đây là slide nơi category được sinh ra. KHÔNG làm rối nó.",
    action: "Cho thấy sự chuyển đổi: Ghi nhận → Quyết định. Đơn giản."
  },
  4: {
    tip: "Infrastructure = kết quả lớn. Không phải dashboards. Không phải analytics.",
    action: "Để định nghĩa thấm. Đừng giải thích quá nhiều."
  },
  5: {
    tip: "Hầu hết founders underplay timing. ĐỪNG. Timing bán được công ty.",
    action: "Tín hiệu tài chính cuối cùng đã có thể kết nối."
  },
  6: {
    tip: "Đây là slide 'macro shift' của bạn. VC đầu tư vào shifts, không phải tools.",
    action: "Kill line: Vận hành không có real-time awareness = vận hành không có kế toán."
  },
  7: {
    tip: "Infra founders oversell features — sai lầm. Giữ nó TIGHT.",
    action: "Chỉ 3 vai trò: CFO, COO, CEO. Không có screenshots UI."
  },
  8: {
    tip: "Đây không phải phần mềm lắp ráp. Đây là cơ sở hạ tầng được thiết kế.",
    action: "Partner nghĩ: Khó sao chép. Tốt."
  },
  9: {
    tip: "Infra investors YÊU slide này. Trust compounds.",
    action: "Doanh nghiệp không thay thế hệ thống họ tin tưởng."
  },
  10: {
    tip: "Đây là nơi bạn ngừng nghe thông minh và bắt đầu nghe fundable.",
    action: "Partner nghiêng về phía trước ở đây. Cho thấy số thật."
  },
  11: {
    tip: "Slide này giảm mạnh nhận thức rủi ro.",
    action: "Thái Lan bây giờ là beachhead thứ hai đã được xác thực — không phải cược tương lai."
  },
  12: {
    tip: "Triển khai có thể lặp lại. Tín hiệu rất investable.",
    action: "Bluecore mở rộng với localization tối thiểu."
  },
  13: {
    tip: "Không TAM thổi phồng. Partners ngửi được số giả ngay.",
    action: "Bắt đầu với operators nhạy cảm margin cảm nhận decision latency đầu tiên."
  },
  14: {
    tip: "Không cần hype. Số đã mạnh sẵn.",
    action: "Cho thấy wedge kết hợp: $1.4B-$2.3B"
  },
  15: {
    tip: "Sau commerce: consumer brands, distribution, pharmacy, F&B.",
    action: "Partner bây giờ thấy venture scale."
  },
  16: {
    tip: "Nhiều deck quên điều này. Partners đầu tư vào execution clarity.",
    action: "Expansion là có chủ đích — không phải cơ hội."
  },
  17: {
    tip: "3+ năm warehouse maturity. ~99.8% data accuracy.",
    action: "Founder signal trở nên RẤT mạnh ở đây."
  },
  18: {
    tip: "Không bao giờ bỏ qua điều này trong infra decks. Nghe bình tĩnh — gần như hiển nhiên.",
    action: "Kết thúc deck. Để im lặng làm việc. KHÔNG thêm fluff."
  }
};

// ACT 1 — MỞ CATEGORY (Slides 1–4)
const Slide01CategoryShock: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
    >
      Quyết định Tài chính Vẫn Chạy<br />
      <span className="text-amber-400">Trên Hệ thống Chậm trễ.</span>
    </motion.h1>
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.8 }}
      className="max-w-3xl mb-8"
    >
      <p className="text-xl md:text-2xl font-light text-slate-300 mb-2">
        Thương mại giờ di chuyển theo thời gian thực.
      </p>
      <p className="text-xl md:text-2xl font-light text-slate-400">
        Sự thật tài chính vẫn đến muộn hàng tuần.
      </p>
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-10"
    >
      {[
        "CAC thay đổi hàng ngày",
        "Margin bị nén tức thì",
        "Rủi ro tồn kho cộng dồn",
        "Rủi ro tiền mặt leo thang"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 + i * 0.1 }}
          className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 text-sm"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="text-xl text-red-400 font-medium"
    >
      Độ trễ quyết định đang trở thành rủi ro sống còn.
    </motion.p>
  </div>
);

const Slide02SilentFailure: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
    >
      Doanh nghiệp Hiếm khi Thất bại vì Thiếu Data.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-amber-400 mb-12"
    >
      Họ Thất bại vì Sự thật Tài chính Đến muộn.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="max-w-2xl"
    >
      <p className="text-xl text-slate-300 mb-6">Stack hiện đại được tối ưu cho:</p>
      <div className="flex justify-center gap-4 mb-8">
        {["Ghi nhận", "Báo cáo", "Phân tích"].map((item, i) => (
          <span key={i} className="px-4 py-2 bg-slate-800 rounded-lg text-slate-400">{item}</span>
        ))}
      </div>
      <p className="text-xl text-slate-400">
        Không phải <span className="text-white font-medium">quyết định.</span>
      </p>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="mt-10 text-lg text-slate-500 italic"
    >
      Lãnh đạo buộc phải vận hành theo kiểu phản ứng.
    </motion.p>
  </div>
);

const Slide03PlatformShift: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-12"
    >
      Hệ thống Ghi nhận → <span className="text-blue-400">Hệ thống Quyết định</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col gap-4 max-w-lg w-full"
    >
      {[
        { label: "ERP", desc: "ghi nhận quá khứ", color: "slate" },
        { label: "BI", desc: "giải thích quá khứ", color: "slate" },
        { label: "Bluecore", desc: "dẫn dắt bước tiếp theo", color: "blue" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className={cn(
            "flex items-center justify-between p-4 rounded-lg",
            item.color === "slate" && "bg-slate-800/50 border border-slate-700",
            item.color === "blue" && "bg-blue-500/20 border border-blue-500/40"
          )}
        >
          <span className={cn(
            "font-bold text-xl",
            item.color === "slate" ? "text-slate-300" : "text-blue-400"
          )}>{item.label}</span>
          <span className={cn(
            "text-lg",
            item.color === "slate" ? "text-slate-500" : "text-blue-300"
          )}>{item.desc}</span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-12 text-xl text-slate-400 italic border-l-4 border-blue-500 pl-6"
    >
      Một tầng thực thi mới đang xuất hiện bên trong các công ty hiện đại.
    </motion.p>
  </div>
);

const Slide04DefineCategory: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-6"
    >
      <span className="text-blue-400 text-xl font-medium tracking-wider uppercase">Giới thiệu</span>
    </motion.div>
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-10"
    >
      Cơ sở Hạ tầng<br />
      <span className="text-blue-400">Quyết định Tài chính.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="max-w-2xl text-left mb-8"
    >
      <p className="text-lg text-slate-300 mb-4">Một tầng vận hành mới:</p>
      <ul className="space-y-2 text-slate-400">
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> thống nhất sự thật tài chính</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> mô hình hóa rủi ro vận hành</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> phát hiện rủi ro thời gian thực</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> hướng dẫn hành động lãnh đạo</li>
      </ul>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="text-xl text-slate-500"
    >
      Không phải dashboards. Không phải analytics. <span className="text-white font-medium">Cơ sở hạ tầng.</span>
    </motion.p>
  </div>
);

// ACT 2 — TẠI SAO BÂY GIỜ (Slides 5–6)
const Slide05WhyImpossibleBefore: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Chỉ Bây giờ Cơ sở Hạ tầng Quyết định
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-emerald-400 mb-12"
    >
      Mới Khả thi về Kỹ thuật.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full"
    >
      {[
        "Hệ sinh thái commerce API-first",
        "Số hóa thanh toán",
        "Warehouse trưởng thành",
        "Data pipelines thời gian thực"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-emerald-500/30 text-slate-300"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-12 text-xl text-emerald-400 font-medium"
    >
      Tín hiệu tài chính cuối cùng đã có thể kết nối.
    </motion.p>
  </div>
);

const Slide06WhyMandatory: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Tốc độ Quyết định Đang Trở thành
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Lợi thế Cạnh tranh.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col gap-3 max-w-lg mb-10"
    >
      {[
        "Margin bị nén.",
        "Vốn đắt đỏ.",
        "Biến động vận hành đang tăng."
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="text-xl text-slate-300"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="text-lg text-slate-400 mb-10"
    >
      Doanh nghiệp không thể chờ sự thật cuối tháng nữa.
    </motion.p>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1 }}
      className="text-xl text-slate-300 italic border-l-4 border-blue-500 pl-6 max-w-2xl"
    >
      Sắp tới, vận hành không có nhận thức tài chính thời gian thực<br />
      <span className="text-white font-medium">sẽ cảm thấy như vận hành không có kế toán.</span>
    </motion.p>
  </div>
);

// ACT 3 — SẢN PHẨM (Slides 7–9)
const Slide07ProductOneSentence: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8"
    >
      Một Sự thật Tài chính Duy nhất —<br />
      <span className="text-blue-400">Được Tin tưởng Thời gian Thực.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-xl text-slate-300 mb-10"
    >
      Khi lãnh đạo tin tưởng hệ thống, nó trở thành cơ sở hạ tầng vận hành.
    </motion.p>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full"
    >
      {[
        { role: "CFO", focus: "Rủi ro Tiền mặt" },
        { role: "COO", focus: "Rò rỉ Vận hành" },
        { role: "CEO", focus: "Rủi ro Margin" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 + i * 0.15 }}
          className="p-6 rounded-xl bg-slate-800/50 border border-blue-500/30"
        >
          <div className="text-blue-400 text-2xl font-bold mb-2">{item.role}</div>
          <div className="text-slate-300">{item.focus}</div>
        </motion.div>
      ))}
    </motion.div>
  </div>
);

const Slide08ArchitectureAdvantage: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-12"
    >
      Sự thật Tài chính Là Bài toán<br />
      <span className="text-amber-400">Kiến trúc.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center gap-3 max-w-md"
    >
      {[
        "Nguồn dữ liệu",
        "Chuẩn hóa ngữ nghĩa",
        "Đối soát",
        "Dataset quyết định",
        "Cảnh báo"
      ].map((item, i) => (
        <React.Fragment key={i}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className={cn(
              "w-full py-3 px-6 rounded-lg text-center font-medium",
              i === 0 ? "bg-slate-700 text-slate-200" :
              i === 4 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
              "bg-blue-500/20 text-blue-400 border border-blue-500/40"
            )}
          >
            {item}
          </motion.div>
          {i < 4 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-slate-500 text-xl"
            >
              →
            </motion.div>
          )}
        </React.Fragment>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="mt-10 text-lg text-slate-400 italic"
    >
      Đây không phải phần mềm lắp ráp. <span className="text-white">Đây là cơ sở hạ tầng được thiết kế.</span>
    </motion.p>
  </div>
);

const Slide09SwitchingCost: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-8"
    >
      Doanh nghiệp Không Thay thế Hệ thống<br />
      <span className="text-blue-400">Họ Tin tưởng Để Nói Sự thật.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
      className="p-8 rounded-xl bg-blue-500/10 border border-blue-500/30 max-w-xl"
    >
      <p className="text-2xl text-blue-300 font-medium mb-4">Trust cộng hưởng.</p>
      <p className="text-lg text-slate-300">
        Khi đã nhúng vào workflow quyết định,<br />
        rủi ro thay thế giảm đáng kể.
      </p>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-10 text-lg text-slate-500 italic"
    >
      Infra investors hiểu điều này.
    </motion.p>
  </div>
);

// ACT 4 — TRACTION (Slides 10–12)
const Slide10MissionCritical: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Đã Đang Trở thành
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-emerald-400 mb-12"
    >
      Thiết yếu cho Vận hành.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-10"
    >
      {[
        { label: "ARR", value: "~$200K" },
        { label: "Retention", value: "90-95%" },
        { label: "Sử dụng", value: "Hàng ngày" },
        { label: "Workflows", value: "Phụ thuộc tài chính" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-emerald-500/30"
        >
          <div className="text-slate-400 text-sm mb-1">{item.label}</div>
          <div className="text-emerald-400 text-xl font-bold">{item.value}</div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="text-xl text-slate-300 italic border-l-4 border-emerald-500 pl-6"
    >
      Executives mở Bluecore hàng ngày — không phải hàng tháng.<br />
      <span className="text-white font-medium">Đó là hành vi infrastructure.</span>
    </motion.p>
  </div>
);

const Slide11CrossBorder: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Đã Được Chứng minh Ngoài
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Thị trường Gốc.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full mb-8"
    >
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 text-left">
        <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">Xây dựng tại</div>
        <div className="text-white text-2xl font-bold">Việt Nam</div>
      </div>
      <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/40 text-left">
        <div className="text-blue-400 text-sm uppercase tracking-wider mb-2">Triển khai tại</div>
        <div className="text-white text-2xl font-bold">Thái Lan</div>
        <div className="text-slate-400 mt-2">Nhà bán lẻ hàng đầu</div>
        <div className="text-emerald-400 font-medium">~$3K MRR (~$36K ARR)</div>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="text-lg text-slate-300 italic"
    >
      Thái Lan bây giờ là beachhead thứ hai đã được xác thực —<br />
      <span className="text-white">không phải cược mở rộng tương lai.</span>
    </motion.p>
  </div>
);

const Slide12ArchitectureTravels: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Độ Phức tạp Tài chính Tương tự về Cấu trúc
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Khắp Đông Nam Á.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-10"
    >
      {[
        "Phân mảnh đa kênh",
        "Áp lực tiền mặt",
        "Rủi ro tồn kho",
        "Biến động marketing"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 text-sm"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="text-xl text-emerald-400 font-medium"
    >
      Bluecore mở rộng với localization tối thiểu.
    </motion.p>
  </div>
);

// ACT 5 — THỊ TRƯỜNG (Slides 13–15)
const Slide13InitialWedge: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-12"
    >
      Chúng tôi Bắt đầu với<br />
      <span className="text-blue-400">Commerce Operators Nhạy cảm Margin.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="max-w-xl text-left"
    >
      <p className="text-lg text-slate-300 mb-6">Hồ sơ mục tiêu:</p>
      <ul className="space-y-3 text-slate-400">
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> Retailers & ecommerce mid-market</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> Doanh thu: $2M–$50M</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> Độ phức tạp vận hành cao</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> Kinh tế nhạy cảm quyết định</li>
      </ul>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-10 text-lg text-slate-500 italic"
    >
      Những công ty này cảm nhận độ trễ quyết định đầu tiên.
    </motion.p>
  </div>
);

const Slide14SEAMarket: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Wedge <span className="text-emerald-400">$1B+</span>
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Khắp Đông Nam Á.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-8"
    >
      {[
        { country: "Việt Nam", range: "$150–250M" },
        { country: "Thái Lan", range: "$350–500M" },
        { country: "Indonesia", range: "$900M–1.6B" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="p-6 rounded-xl bg-slate-800/50 border border-slate-700"
        >
          <div className="text-slate-400 text-sm mb-2">{item.country}</div>
          <div className="text-white text-2xl font-bold">{item.range}</div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/40"
    >
      <span className="text-emerald-400 font-medium">Wedge kết hợp: $1.4B–$2.3B</span>
    </motion.div>
  </div>
);

const Slide15ExpansionUnlocks: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Expansion Mở khóa
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Category Nhiều Tỷ đô.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="mb-8"
    >
      <p className="text-lg text-slate-300 mb-6">Sau commerce:</p>
      <div className="flex flex-wrap justify-center gap-3">
        {["Consumer brands", "Distribution", "Chuỗi nhà thuốc", "F&B groups"].map((item, i) => (
          <motion.span 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="px-4 py-2 bg-slate-800 rounded-lg text-slate-300"
          >
            {item}
          </motion.span>
        ))}
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="text-lg text-slate-400 mb-6"
    >
      Decision infrastructure trở nên horizontal.
    </motion.p>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1 }}
      className="text-xl text-emerald-400 font-medium"
    >
      Tiềm năng category vượt $5B riêng Đông Nam Á.
    </motion.p>
  </div>
);

// ACT 6 — CHIẾN LƯỢC (Slides 16–17)
const Slide16RegionalExpansion: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Xây dựng tại Việt Nam.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Mở rộng Khắp Đông Nam Á.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col gap-4 max-w-lg w-full"
    >
      {[
        { market: "Việt Nam", status: "Thị trường build chính", color: "slate" },
        { market: "Thái Lan", status: "Beachhead thứ hai (doanh thu live)", color: "blue" },
        { market: "Indonesia", status: "Expansion quy mô category", color: "emerald" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className={cn(
            "flex items-center justify-between p-4 rounded-lg",
            item.color === "slate" && "bg-slate-800/50 border border-slate-700",
            item.color === "blue" && "bg-blue-500/20 border border-blue-500/40",
            item.color === "emerald" && "bg-emerald-500/20 border border-emerald-500/40"
          )}
        >
          <span className={cn(
            "font-bold text-xl",
            item.color === "slate" ? "text-slate-300" :
            item.color === "blue" ? "text-blue-400" : "text-emerald-400"
          )}>{item.market}</span>
          <span className={cn(
            "text-sm",
            item.color === "slate" ? "text-slate-500" :
            item.color === "blue" ? "text-blue-300" : "text-emerald-300"
          )}>{item.status}</span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-10 text-lg text-slate-500 italic"
    >
      Expansion có chủ đích — không phải cơ hội.
    </motion.p>
  </div>
);

const Slide17WhyBluecoreWins: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Xây dựng Financial Truth Layer
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Trước khi Category Tồn tại.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl w-full mb-10"
    >
      {[
        "3+ năm warehouse maturity",
        "~99.8% data accuracy",
        "Deep financial semantics",
        "Reconciliation logic",
        "Multi-source ingestion"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="text-lg text-slate-400"
    >
      Hầu hết công ty bắt đầu với dashboards.
    </motion.p>
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="text-xl text-white font-medium"
    >
      Chúng tôi bắt đầu với sự thật.
    </motion.p>
  </div>
);

// ACT 7 — TẦM NHÌN (Slide 18)
const Slide18Inevitability: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
    >
      ERP Đã Trở thành Bắt buộc.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-400 mb-12"
    >
      Decision Infrastructure Cũng Sẽ Vậy.
    </motion.h2>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="text-xl text-slate-300 mb-12 max-w-2xl"
    >
      Sắp tới, doanh nghiệp sẽ không tranh luận<br />
      liệu họ có cần hệ thống quyết định tài chính.<br />
      <span className="text-white font-medium">Chỉ là tin tưởng hệ thống nào.</span>
    </motion.p>
    
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.9 }}
      className="p-8 rounded-xl bg-blue-500/10 border border-blue-500/30 max-w-2xl"
    >
      <p className="text-2xl text-slate-300 font-light mb-2">
        Chúng tôi Không Xây dựng Phần mềm.
      </p>
      <p className="text-2xl text-white font-medium">
        Chúng tôi Xây dựng Hệ thống Doanh nghiệp Dựa vào Để Tồn tại.
      </p>
    </motion.div>
  </div>
);

const slides = [
  Slide01CategoryShock,
  Slide02SilentFailure,
  Slide03PlatformShift,
  Slide04DefineCategory,
  Slide05WhyImpossibleBefore,
  Slide06WhyMandatory,
  Slide07ProductOneSentence,
  Slide08ArchitectureAdvantage,
  Slide09SwitchingCost,
  Slide10MissionCritical,
  Slide11CrossBorder,
  Slide12ArchitectureTravels,
  Slide13InitialWedge,
  Slide14SEAMarket,
  Slide15ExpansionUnlocks,
  Slide16RegionalExpansion,
  Slide17WhyBluecoreWins,
  Slide18Inevitability
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
      description: 'Vui lòng chờ một chút',
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
      
      toast.success('Tải xuống hoàn tất!', {
        description: 'Bluecore_VC_Pitch_Deck_VI.pdf',
      });
    } catch (error) {
      console.error('Lỗi tạo PDF:', error);
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
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(i); }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === currentSlide ? "bg-blue-400 w-4" : "bg-slate-600 hover:bg-slate-500"
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
                  <div className="text-blue-400 text-sm font-medium mb-2">Mẹo cho Founder</div>
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
                  Dùng <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">→</kbd> để chuyển slide
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
