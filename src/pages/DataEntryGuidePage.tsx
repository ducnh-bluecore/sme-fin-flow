import { Helmet } from "react-helmet-async";
import { BookOpen } from "lucide-react";
import { DataPreparationGuide } from "@/components/guide/DataPreparationGuide";

const DataEntryGuidePage = () => {
  return (
    <>
      <Helmet>
        <title>Hướng dẫn nhập liệu & tích hợp | Hệ thống quản lý tài chính</title>
        <meta name="description" content="Hướng dẫn chuẩn bị dữ liệu để import hoặc kết nối API. Template CSV, Excel và hướng dẫn mapping từ các nguồn phổ biến." />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Hướng dẫn nhập liệu & tích hợp
          </h1>
          <p className="text-muted-foreground mt-2">
            Chuẩn bị dữ liệu để import file hoặc kết nối API từ các hệ thống khác
          </p>
        </div>

        <DataPreparationGuide />
      </div>
    </>
  );
};

export default DataEntryGuidePage;
