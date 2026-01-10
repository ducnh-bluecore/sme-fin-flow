import { Helmet } from "react-helmet-async";
import { BookOpen } from "lucide-react";
import { DataPreparationGuide } from "@/components/guide/DataPreparationGuide";
import { useLanguage } from "@/contexts/LanguageContext";

const DataEntryGuidePage = () => {
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{t('guide.title')} | Bluecore Finance</title>
        <meta name="description" content={t('guide.pageDesc')} />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            {t('guide.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('guide.subtitle')}
          </p>
        </div>

        <DataPreparationGuide />
      </div>
    </>
  );
};

export default DataEntryGuidePage;
