import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Database, ArrowLeft, HardDrive, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BigQueryConfigPanel } from '@/components/connectors/BigQueryConfigPanel';

export default function DataWarehousePage() {
  return (
    <>
      <Helmet>
        <title>Data Warehouse | Bluecore Finance</title>
        <meta name="description" content="Cấu hình và đồng bộ dữ liệu từ Google BigQuery" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Link to="/data-hub">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Data Warehouse</h1>
              <p className="text-muted-foreground">Cấu hình và đồng bộ dữ liệu từ Google BigQuery</p>
            </div>
          </div>
        </motion.div>

        {/* BigQuery Config Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BigQueryConfigPanel />
        </motion.div>
      </div>
    </>
  );
}
