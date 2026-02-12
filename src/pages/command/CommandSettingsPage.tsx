import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CommandSettingsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Command Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Allocation policies, store tiers, size curve profiles</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allocation Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure base, dynamic, scarcity, and repair allocation policies with custom weights and constraints.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SKU Criticality</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define CORE, HERO, and LONGTAIL SKU classifications for allocation priority.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Size Curve Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set ideal size ratios by category, fit, and season for assortment health monitoring.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Store Tier Config</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage store tier assignments (S/A/B/C) and associated weight multipliers.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
