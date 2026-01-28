import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Settings, Bell, Clock, Users, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

/**
 * SETTINGS PAGE - Configuration
 * 
 * Tabs:
 * - Escalation Rules
 * - Thresholds
 * - Team Management
 * - Notifications
 */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('escalation');
  
  // Local state for settings (would connect to DB in production)
  const [escalationSettings, setEscalationSettings] = useState({
    criticalTimeout: 4,
    warningTimeout: 24,
    autoEscalateToCEO: true,
    impactThreshold: 100_000_000,
  });

  const [thresholds, setThresholds] = useState({
    cashBurnWarning: 1.5,
    cashBurnCritical: 2.0,
    marginWarning: 5,
    marginCritical: 10,
    roasWarning: 1.0,
    roasCritical: 0.5,
  });

  const handleSaveEscalation = () => {
    toast.success('Escalation rules saved');
  };

  const handleSaveThresholds = () => {
    toast.success('Thresholds saved');
  };

  return (
    <>
      <Helmet>
        <title>Settings | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Control Tower Settings</h1>
            <p className="text-sm text-muted-foreground">
              Cấu hình escalation, thresholds và team
            </p>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="escalation" className="gap-2">
              <Clock className="h-4 w-4" />
              Escalation
            </TabsTrigger>
            <TabsTrigger value="thresholds" className="gap-2">
              <Shield className="h-4 w-4" />
              Thresholds
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Escalation Tab */}
          <TabsContent value="escalation" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Escalation Rules</CardTitle>
                <CardDescription>
                  Cấu hình thời gian tự động escalate các alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Critical Alert Timeout (hours)</Label>
                    <Input
                      type="number"
                      value={escalationSettings.criticalTimeout}
                      onChange={(e) => setEscalationSettings(s => ({
                        ...s,
                        criticalTimeout: parseInt(e.target.value) || 4
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Escalate nếu Critical alert chưa xử lý sau X giờ
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Warning Alert Timeout (hours)</Label>
                    <Input
                      type="number"
                      value={escalationSettings.warningTimeout}
                      onChange={(e) => setEscalationSettings(s => ({
                        ...s,
                        warningTimeout: parseInt(e.target.value) || 24
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Escalate nếu Warning alert chưa xử lý sau X giờ
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Impact Threshold for Immediate Escalation (VND)</Label>
                  <Input
                    type="number"
                    value={escalationSettings.impactThreshold}
                    onChange={(e) => setEscalationSettings(s => ({
                      ...s,
                      impactThreshold: parseInt(e.target.value) || 100_000_000
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Escalate ngay lập tức nếu impact vượt ngưỡng này
                  </p>
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Auto-escalate Critical to CEO</Label>
                    <p className="text-xs text-muted-foreground">
                      Tự động escalate đến CEO nếu CFO/COO không xử lý
                    </p>
                  </div>
                  <Switch
                    checked={escalationSettings.autoEscalateToCEO}
                    onCheckedChange={(checked) => setEscalationSettings(s => ({
                      ...s,
                      autoEscalateToCEO: checked
                    }))}
                  />
                </div>

                <Button onClick={handleSaveEscalation}>Save Escalation Rules</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Thresholds Tab */}
          <TabsContent value="thresholds" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Alert Thresholds</CardTitle>
                <CardDescription>
                  Định nghĩa ngưỡng Warning và Critical cho các metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cash Burn Rate */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Cash Burn Rate</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Warning (x normal)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={thresholds.cashBurnWarning}
                        onChange={(e) => setThresholds(s => ({
                          ...s,
                          cashBurnWarning: parseFloat(e.target.value) || 1.5
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Critical (x normal)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={thresholds.cashBurnCritical}
                        onChange={(e) => setThresholds(s => ({
                          ...s,
                          cashBurnCritical: parseFloat(e.target.value) || 2.0
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Margin Decline */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Margin Decline</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Warning (%)</Label>
                      <Input
                        type="number"
                        value={thresholds.marginWarning}
                        onChange={(e) => setThresholds(s => ({
                          ...s,
                          marginWarning: parseInt(e.target.value) || 5
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Critical (%)</Label>
                      <Input
                        type="number"
                        value={thresholds.marginCritical}
                        onChange={(e) => setThresholds(s => ({
                          ...s,
                          marginCritical: parseInt(e.target.value) || 10
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* ROAS */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">ROAS</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Warning (below)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={thresholds.roasWarning}
                        onChange={(e) => setThresholds(s => ({
                          ...s,
                          roasWarning: parseFloat(e.target.value) || 1.0
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Critical (below)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={thresholds.roasCritical}
                        onChange={(e) => setThresholds(s => ({
                          ...s,
                          roasCritical: parseFloat(e.target.value) || 0.5
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveThresholds}>Save Thresholds</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Configuration</CardTitle>
                <CardDescription>
                  Quản lý team members và vai trò trong Control Tower
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { role: 'CEO', name: 'Nguyễn Văn A', email: 'ceo@company.com' },
                    { role: 'CFO', name: 'Trần Thị B', email: 'cfo@company.com' },
                    { role: 'CMO', name: 'Lê Văn C', email: 'cmo@company.com' },
                    { role: 'COO', name: 'Phạm Thị D', email: 'coo@company.com' },
                  ].map((member) => (
                    <div 
                      key={member.role}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{member.role}</Badge>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  ))}
                </div>
                <Button className="mt-4" variant="outline">+ Add Team Member</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Cấu hình kênh thông báo cho alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { channel: 'Email', enabled: true, icon: '📧' },
                  { channel: 'Slack', enabled: true, icon: '💬' },
                  { channel: 'SMS', enabled: false, icon: '📱' },
                  { channel: 'Push Notification', enabled: true, icon: '🔔' },
                ].map((channel) => (
                  <div 
                    key={channel.channel}
                    className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{channel.icon}</span>
                      <Label>{channel.channel}</Label>
                    </div>
                    <Switch defaultChecked={channel.enabled} />
                  </div>
                ))}

                <div className="pt-4 border-t">
                  <Label className="text-base font-medium">Digest Settings</Label>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Daily Digest</Label>
                      <Select defaultValue="8am">
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6am">6:00 AM</SelectItem>
                          <SelectItem value="8am">8:00 AM</SelectItem>
                          <SelectItem value="9am">9:00 AM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Weekly Report</Label>
                      <Select defaultValue="monday">
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="friday">Friday</SelectItem>
                          <SelectItem value="sunday">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
