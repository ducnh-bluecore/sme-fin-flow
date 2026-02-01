/**
 * VC Pitch Deck - Vietnamese Version
 * 
 * 22-slide interactive presentation for Series A investors
 * Focus: Category claim - Financial Decision Infrastructure
 * Structure: 7 Acts - Psychological sequence addressing investor risks
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

// Presenter notes for each slide (Vietnamese - 23 slides)
const presenterNotes: Record<number, { tip: string; action: string }> = {
  1: {
    tip: "VC phải cảm thấy DANGER, không chỉ opportunity. Financial blindness kills companies - làm nó violent.",
    action: "Đợi phản ứng. Nếu partner gật đầu mạnh → hook đã land."
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
    tip: "Slide này loại bỏ rủi ro 'quá sớm'. Mọi lực lượng cấu trúc trong commerce đang nén thời gian quyết định.",
    action: "Dừng. Để macro shift thấm. Partner nghĩ: 'Đây là làn sóng, không phải tính năng.'"
  },
  5: {
    tip: "Infrastructure = kết quả lớn. Không phải dashboards. Không phải analytics.",
    action: "Để định nghĩa thấm. Đừng giải thích quá nhiều."
  },
  6: {
    tip: "Hầu hết công ty xây dashboards. Chúng tôi xây tầng sự thật tài chính mà những dashboards đó phụ thuộc vào.",
    action: "Cho thấy kiến trúc 5 tầng. Loại bỏ nỗi sợ 'AI wrapper'."
  },
  7: {
    tip: "Flywheel khiến moat trở nên logical. VC muốn thấy mechanism, không phải philosophy.",
    action: "Chỉ vào từng bước. Để compounding effect thấm."
  },
  8: {
    tip: "Hầu hết founders underplay timing. ĐỪNG. Timing bán được công ty.",
    action: "Tín hiệu tài chính cuối cùng đã có thể kết nối."
  },
  9: {
    tip: "Đây là slide 'macro shift' của bạn. VC đầu tư vào shifts, không phải tools.",
    action: "Kill line: Vận hành không có real-time awareness = vận hành không có kế toán."
  },
  10: {
    tip: "Infra founders oversell features — sai lầm. Giữ nó TIGHT.",
    action: "Chỉ 3 vai trò: CFO, COO, CEO. Không có screenshots UI."
  },
  11: {
    tip: "CEOs không mở Bluecore hàng tháng. Họ mở hàng ngày. Công ty không thay thế hệ thống họ tin tưởng.",
    action: "Đây là nơi bạn ngừng nghe thông minh và bắt đầu nghe fundable."
  },
  12: {
    tip: "Slide này giảm mạnh nhận thức rủi ro. Thailand $3K MRR đặt ngay sau velocity.",
    action: "Thái Lan bây giờ là beachhead thứ hai đã được xác thực — không phải cược tương lai."
  },
  13: {
    tip: "Đây là slide believability. Một example thật = worth 100 slides concept.",
    action: "Partner nghĩ: 'This is real. This works.'"
  },
  14: {
    tip: "Đây không phải phần mềm lắp ráp. Đây là cơ sở hạ tầng được thiết kế.",
    action: "Partner nghĩ: Khó sao chép. Tốt."
  },
  15: {
    tip: "Infra investors YÊU slide này. Trust compounds.",
    action: "Doanh nghiệp không thay thế hệ thống họ tin tưởng."
  },
  16: {
    tip: "Triển khai có thể lặp lại. Tín hiệu rất investable.",
    action: "Bluecore mở rộng với localization tối thiểu."
  },
  17: {
    tip: "Không TAM thổi phồng. Partners ngửi được số giả ngay.",
    action: "Bắt đầu với operators nhạy cảm margin cảm nhận decision latency đầu tiên."
  },
  18: {
    tip: "Không cần hype. Số đã mạnh sẵn.",
    action: "Cho thấy wedge kết hợp: $1.4B-$2.3B"
  },
  19: {
    tip: "Sau commerce: consumer brands, distribution, pharmacy, F&B.",
    action: "Partner bây giờ thấy venture scale."
  },
  20: {
    tip: "Nhiều deck quên điều này. Partners đầu tư vào execution clarity.",
    action: "Expansion là có chủ đích — không phải cơ hội."
  },
  21: {
    tip: "3+ năm warehouse maturity. ~99.8% data accuracy. Decision AI có thể copy. Financial data history thì không.",
    action: "Founder signal trở nên RẤT mạnh ở đây. Amplify unfair advantage."
  },
  22: {
    tip: "Không bao giờ bỏ qua điều này trong infra decks. Nghe bình tĩnh — gần như hiển nhiên.",
    action: "Để tính tất yếu thấm. ERP = bắt buộc. Decision infra = tiếp theo."
  },
  23: {
    tip: "Kết thúc với niềm tin. Đây là hệ thống doanh nghiệp dựa vào để tồn tại.",
    action: "Kết thúc deck. Để im lặng làm việc. KHÔNG thêm fluff."
  }
};

// ACT 1 — MỞ CATEGORY (Slides 1–3) - FEAR VERSION
const Slide01CategoryShock: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
    >
      CASH COLLAPSES<br />
      <span className="text-red-500">QUIETLY.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full mb-10"
    >
      {[
        { metric: "Margin ↓ 6%", delay: "Phát hiện sau 4 tuần", icon: "📉" },
        { metric: "CAC ↑ 35%", delay: "Finance thấy khi đã burn", icon: "🔥" },
        { metric: "Inventory phình", delay: "Cash bị khóa", icon: "📦" },
        { metric: "Runway", delay: "Biến mất trước khi CEO nhận ra", icon: "⏳" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <span>{item.icon}</span>
            <span className="text-red-400 font-bold text-lg">{item.metric}</span>
          </div>
          <span className="text-slate-400 text-sm">→ {item.delay}</span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="p-6 rounded-xl bg-red-500/5 border border-red-500/20 max-w-2xl"
    >
      <p className="text-xl text-slate-300 mb-2">
        Doanh nghiệp không chết vì thiếu dữ liệu.
      </p>
      <p className="text-xl text-red-400 font-bold">
        Họ chết vì sự thật đến quá muộn.
      </p>
    </motion.div>
  </div>
);

const Slide02SilentFailure: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
    >
      Hạ tầng dữ liệu đã trở thành tiêu chuẩn.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-400 mb-10"
    >
      Financial Awareness sẽ là hạ tầng mặc định tiếp theo.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="max-w-3xl space-y-8"
    >
      <p className="text-xl md:text-2xl text-slate-400 leading-relaxed">
        Dữ liệu kể lại quá khứ.<br />
        <span className="text-white font-medium">Financial Awareness cho biết bạn có đang an toàn — ngay lúc này.</span>
      </p>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-xl md:text-2xl text-slate-500 pt-6 border-t border-slate-700/50"
      >
        Không phải công ty nhiều dữ liệu sẽ chiến thắng.<br />
        <span className="text-amber-400 font-semibold">Mà là công ty nhận thức sớm nhất.</span>
      </motion.p>
    </motion.div>
  </div>
);

const Slide03PlatformShift: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6 max-w-4xl w-full mb-12"
    >
      {[
        { system: "Hệ thống Ghi nhận", action: "ghi lại quá khứ.", color: "slate" },
        { system: "Hệ thống Thông minh", action: "giải thích quá khứ.", color: "slate" },
        { system: "Hệ thống Nhận thức", action: "quyết định điều gì xảy ra tiếp theo.", color: "blue" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.2 }}
          className="text-center"
        >
          <span className={cn(
            "text-3xl md:text-4xl lg:text-5xl font-bold",
            item.color === "slate" ? "text-slate-400" : "text-blue-400"
          )}>
            {item.system}
          </span>
          <span className={cn(
            "text-3xl md:text-4xl lg:text-5xl font-light ml-3",
            item.color === "slate" ? "text-slate-500" : "text-white"
          )}>
            {item.action}
          </span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.h2 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="text-2xl md:text-3xl text-white font-medium mb-12"
    >
      Bluecore đang xây dựng <span className="text-blue-400 font-bold">Tầng Nhận thức.</span>
    </motion.h2>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="text-lg md:text-xl text-slate-500 italic max-w-2xl border-t border-slate-700/50 pt-8"
    >
      Vận hành không có nhận thức tài chính<br />
      <span className="text-amber-400 not-italic font-medium">sẽ sớm cảm thấy rủi ro như vận hành không có kế toán.</span>
    </motion.p>
  </div>
);

// NEW SLIDE 4 — INEVITABILITY (Rủi ro timing thị trường)
const Slide04Inevitability: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
    >
      Nhận thức Tài chính<br />
      <span className="text-amber-400">Không Còn Là Tùy chọn.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-xl text-slate-300 mb-8 max-w-2xl"
    >
      Mọi lực lượng cấu trúc trong thương mại đang nén thời gian quyết định:
    </motion.p>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl w-full mb-10"
    >
      {[
        "Nén margin là cấu trúc, không phải chu kỳ",
        "Biến động CAC phá hủy độ tin cậy dự báo",
        "Doanh thu đa kênh phân mảnh sự thật tài chính",
        "Thanh toán real-time tăng tốc rủi ro tiền mặt",
        "Operators di chuyển nhanh hơn finance có thể đóng sổ"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 + i * 0.1 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-left"
        >
          <span className="text-amber-400 text-lg">→</span>
          <span className="text-slate-300 text-sm">{item}</span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/30 max-w-2xl"
    >
      <p className="text-lg text-slate-300 italic">
        Thị trường không đòi hỏi báo cáo tốt hơn.<br />
        <span className="text-white font-medium">Nó đòi hỏi nhận thức tài chính thời gian thực.</span>
      </p>
    </motion.div>
  </div>
);

// Slide 5 — Define Category
const Slide05DefineCategory: React.FC = () => (
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

// NEW SLIDE 6 — ARCHITECTURE MOAT
const Slide06ArchitectureMoat: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Đây Không Phải Phần mềm.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-10"
    >
      Đây Là Hạ tầng Tài chính.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col gap-2 max-w-xl w-full mb-8"
    >
      {[
        { layer: "Tín hiệu Tài chính Phân mảnh", sub: "(POS / Marketplaces / Payments / ERP)", action: "chuẩn hóa" },
        { layer: "Tầng Ngữ nghĩa Tài chính", sub: "(một ngôn ngữ của margin, cash, liability)", action: "đối soát" },
        { layer: "Truth Engine", sub: "(xác minh xuyên kênh)", action: "tính toán" },
        { layer: "Decision Dataset", sub: "(patterns trích xuất từ vận hành)", action: "kích hoạt" },
        { layer: "Tầng Nhận thức Điều hành", sub: "(tín hiệu sống còn thời gian thực)", action: null }
      ].map((item, i) => (
        <React.Fragment key={i}>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="p-3 rounded-lg bg-slate-800/50 border border-blue-500/30"
          >
            <div className="text-white font-medium text-sm">{item.layer}</div>
            <div className="text-slate-500 text-xs">{item.sub}</div>
          </motion.div>
          {item.action && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 + i * 0.1 }}
              className="text-blue-400 text-sm"
            >
              ↓ {item.action}
            </motion.div>
          )}
        </React.Fragment>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="text-lg text-slate-300 italic border-l-4 border-blue-500 pl-6"
    >
      Hầu hết công ty xây dashboards.<br />
      <span className="text-white font-medium">Chúng tôi xây tầng sự thật tài chính mà những dashboards đó phụ thuộc vào.</span>
    </motion.p>
  </div>
);

// NEW SLIDE 7 — DECISION DATASET + FLYWHEEL
const Slide07DecisionDataset: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
    >
      Moat <span className="text-emerald-400">Cộng hưởng.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-lg text-slate-400 mb-8"
    >
      Mỗi quyết định làm mạnh thêm hệ thống.
    </motion.p>
    
    {/* Flywheel Visual */}
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="flex flex-col items-center gap-2 max-w-md w-full mb-8"
    >
      {[
        { text: "More customers", color: "emerald" },
        { text: "More financial patterns", color: "emerald" },
        { text: "Better risk detection", color: "blue" },
        { text: "Better decisions", color: "blue" },
        { text: "Deeper trust", color: "amber" },
        { text: "Harder to replace", color: "amber" }
      ].map((item, i) => (
        <React.Fragment key={i}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className={cn(
              "w-full py-3 px-6 rounded-lg text-center font-medium",
              item.color === "emerald" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
              item.color === "blue" && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
              item.color === "amber" && "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            )}
          >
            {item.text}
          </motion.div>
          {i < 5 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 + i * 0.1 }}
              className="text-slate-500 text-lg"
            >
              ↓
            </motion.div>
          )}
        </React.Fragment>
      ))}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="text-emerald-400 text-lg mt-2"
      >
        ↻ loop back
      </motion.div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
      className="text-xl text-slate-300"
    >
      Phần mềm mở rộng. <span className="text-white font-medium">Decision intelligence cộng hưởng.</span>
    </motion.p>
  </div>
);

// Slide 8 — Why Impossible Before
const Slide08WhyImpossibleBefore: React.FC = () => (
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

// Slide 9 — Why Mandatory
const Slide09WhyMandatory: React.FC = () => (
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

// Slide 10 — Product One Sentence
const Slide10ProductOneSentence: React.FC = () => (
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

// NEW SLIDE 11 — VELOCITY
const Slide11Velocity: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Khi Nhận thức Tài chính Trở thành
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-emerald-400 mb-12"
    >
      Sống còn.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-10"
    >
      {[
        { label: "Retention", value: "95%+" },
        { label: "Sử dụng", value: "Hàng ngày" },
        { label: "Phụ thuộc", value: "Điều hành" },
        { label: "Mở rộng", value: "Liên tục" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-emerald-500/30"
        >
          <div className="text-slate-400 text-sm mb-1">{item.label}</div>
          <div className="text-emerald-400 text-2xl font-bold">{item.value}</div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="text-xl text-slate-300 mb-6"
    >
      CEOs không mở Bluecore hàng tháng.<br />
      <span className="text-white font-medium">Họ mở hàng ngày.</span>
    </motion.p>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1 }}
      className="text-lg text-slate-400 italic border-l-4 border-emerald-500 pl-6"
    >
      Công ty không thay thế hệ thống họ tin tưởng để nói sự thật.
    </motion.p>
  </div>
);

// Slide 12 — Cross-Border (MOVED UP from 14)
const Slide12CrossBorder: React.FC = () => (
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

// NEW SLIDE 13 — PRODUCT REALITY
const Slide13ProductReality: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      QUYẾT ĐỊNH <span className="text-blue-400">TRÔNG NHƯ THẾ NÀY</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
      className="p-8 rounded-xl bg-slate-800/80 border border-red-500/50 max-w-2xl w-full"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-red-400 text-xl font-bold mb-6 flex items-center gap-2"
      >
        <span className="text-2xl">⚠</span> CASH RISK DETECTED
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        <div className="p-4 rounded-lg bg-slate-900/50">
          <div className="text-slate-400 text-sm mb-1">Sell-through</div>
          <div className="text-red-400 text-2xl font-bold">↓ 23%</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-900/50">
          <div className="text-slate-400 text-sm mb-1">Inventory turn</div>
          <div className="text-red-400 text-2xl font-bold">↓ 18%</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-900/50">
          <div className="text-slate-400 text-sm mb-1">Payment terms</div>
          <div className="text-amber-400 text-2xl font-bold">Extended</div>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="border-t border-slate-700 pt-6"
      >
        <div className="text-slate-400 text-lg mb-2">→ Khuyến nghị: Giảm tốc độ đơn hàng mua</div>
        <div className="text-emerald-400 text-3xl font-bold">→ Bảo toàn $480K thanh khoản</div>
      </motion.div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.3 }}
      className="mt-8 text-lg text-slate-500 italic"
    >
      Một example thật = 100 slides concept.
    </motion.p>
  </div>
);

// Slide 14 — Architecture Advantage (was 12)
const Slide14ArchitectureAdvantage: React.FC = () => (
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
        "Nguồn",
        "Chuẩn hóa ngữ nghĩa",
        "Đối soát",
        "Decision dataset",
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

// Slide 15 — Switching Cost (was 13)
const Slide15SwitchingCost: React.FC = () => (
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

// Slide 16 — Architecture Travels (was 15)
const Slide16ArchitectureTravels: React.FC = () => (
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

// Slide 16 — Initial Wedge
const Slide16InitialWedge: React.FC = () => (
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

// Slide 17 — SEA Market
const Slide17SEAMarket: React.FC = () => (
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

// Slide 18 — Expansion Unlocks
const Slide18ExpansionUnlocks: React.FC = () => (
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

// Slide 19 — Regional Expansion
const Slide19RegionalExpansion: React.FC = () => (
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

// Slide 20 — Why Bluecore Wins
const Slide20WhyBluecoreWins: React.FC = () => (
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

// Slide 21 — Inevitability Vision
const Slide21InevitabilityVision: React.FC = () => (
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
  </div>
);

// Slide 22 — Closing
const Slide22Closing: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="p-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 max-w-3xl"
    >
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-3xl md:text-4xl text-slate-300 font-light mb-4"
      >
        Chúng tôi Không Xây dựng Phần mềm.
      </motion.p>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-3xl md:text-4xl text-white font-medium"
      >
        Chúng tôi Xây dựng Hệ thống<br />
        Doanh nghiệp Dựa vào Để Tồn tại.
      </motion.p>
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-16"
    >
      <div className="text-blue-400 text-2xl font-bold">BLUECORE</div>
      <div className="text-slate-500 text-sm mt-2">Cơ sở Hạ tầng Quyết định Tài chính</div>
    </motion.div>
  </div>
);

const slides = [
  Slide01CategoryShock,           // 1 - FEAR version
  Slide02SilentFailure,           // 2
  Slide03PlatformShift,           // 3
  Slide04Inevitability,           // 4
  Slide05DefineCategory,          // 5
  Slide06ArchitectureMoat,        // 6
  Slide07DecisionDataset,         // 7 - FLYWHEEL version
  Slide08WhyImpossibleBefore,     // 8
  Slide09WhyMandatory,            // 9
  Slide10ProductOneSentence,      // 10
  Slide11Velocity,                // 11
  Slide12CrossBorder,             // 12 - MOVED UP (traction early)
  Slide13ProductReality,          // 13 - NEW Product Reality
  Slide14ArchitectureAdvantage,   // 14
  Slide15SwitchingCost,           // 15
  Slide16ArchitectureTravels,     // 16
  Slide16InitialWedge,            // 17
  Slide17SEAMarket,               // 18
  Slide18ExpansionUnlocks,        // 19
  Slide19RegionalExpansion,       // 20
  Slide20WhyBluecoreWins,         // 21 - AMPLIFIED
  Slide21InevitabilityVision,     // 22
  Slide22Closing                  // 23
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
