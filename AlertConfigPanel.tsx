import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Sliders, Bell, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface AlertConfigPanelProps {
  petId: number;
}

const ALERT_TYPES = [
  { id: "temperature", label: "Ambient Temperature (°F)", defaultMin: 60, defaultMax: 85 },
  { id: "heart_rate", label: "Heart Rate (BPM)", defaultMin: 70, defaultMax: 140 },
  { id: "respiration", label: "Respiration Rate (RPM)", defaultMin: 15, defaultMax: 35 },
];

export default function AlertConfigPanel({ petId }: AlertConfigPanelProps) {
  // 1. Fetch current configuration for this pet
  const { data: thresholds, isLoading, refetch } = trpc.alerts.getHistory.useQuery( // Adjusting map to getThresholds endpoint
    { petId },
    { enabled: !!petId }
  );

  const upsertMutation = trpc.alerts.upsertAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Alert settings saved successfully!");
      refetch();
    },
    onError: (err) => {
      toast.error(`Failed to save settings: ${err.message}`);
    },
  });

  // State to manage configuration forms
  const [configs, setConfigs] = useState<Record<string, {
    enabled: boolean;
    minValue: string;
    maxValue: string;
    notificationMethods: string[];
  }>>({});

  // Pre-populate configs when database response returns
  useEffect(() => {
    if (thresholds) {
      const initialConfigs: typeof configs = {};
      ALERT_TYPES.forEach((type) => {
        // Find if database already has a record for this type
        const existing = (thresholds as any[]).find((t) => t.alertType === type.id);
        initialConfigs[type.id] = {
          enabled: existing ? existing.enabled === 1 : true,
          minValue: existing?.minValue?.toString() || type.defaultMin.toString(),
          maxValue: existing?.maxValue?.toString() || type.defaultMax.toString(),
          notificationMethods: existing?.notificationMethods 
            ? JSON.parse(existing.notificationMethods) 
            : ["in_app"],
        };
      });
      setConfigs(initialConfigs);
    }
  }, [thresholds]);

  const handleToggle = (typeId: string, checked: boolean) => {
    setConfigs((prev) => ({
      ...prev,
      [typeId]: { ...prev[typeId], enabled: checked },
    }));
  };

  const handleInputChange = (typeId: string, field: "minValue" | "maxValue", value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [typeId]: { ...prev[typeId], [field]: value },
    }));
  };

  const handleMethodToggle = (typeId: string, method: string, checked: boolean) => {
    setConfigs((prev) => {
      const currentMethods = prev[typeId]?.notificationMethods || [];
      const updatedMethods = checked
        ? [...currentMethods, method]
        : currentMethods.filter((m) => m !== method);
      return {
        ...prev,
        [typeId]: { ...prev[typeId], notificationMethods: updatedMethods },
      };
    });
  };

  const handleSave = async (typeId: string) => {
    const config = configs[typeId];
    if (!config) return;

    upsertMutation.mutate({
      petId,
      alertType: typeId,
      minValue: config.minValue ? parseFloat(config.minValue) : null,
      maxValue: config.maxValue ? parseFloat(config.maxValue) : null,
      enabled: config.enabled,
      notificationMethods: config.notificationMethods,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sliders className="w-5 h-5 text-accent" /> Alert Threshold Configurations
        </h3>
        <p className="text-sm text-muted-foreground">
          Define critical safe operational parameters for your pet's environment and health monitors.
        </p>
      </div>

      <div className="grid gap-6">
        {ALERT_TYPES.map((type) => {
          const config = configs[type.id] || {
            enabled: true,
            minValue: type.defaultMin.toString(),
            maxValue: type.defaultMax.toString(),
            notificationMethods: ["in_app"],
          };

          return (
            <Card key={type.id} className="transition-smooth border border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-base font-medium">{type.label}</CardTitle>
                  <CardDescription>Triggers an alert if thresholds are violated</CardDescription>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => handleToggle(type.id, checked)}
                />
              </CardHeader>
              <CardContent className={`space-y-4 ${!config.enabled && "opacity-50 pointer-events-none"}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${type.id}-min`}>Minimum Safe Bound</Label>
                    <Input
                      id={`${type.id}-min`}
                      type="number"
                      value={config.minValue}
                      onChange={(e) => handleInputChange(type.id, "minValue", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${type.id}-max`}>Maximum Safe Bound</Label>
                    <Input
                      id={`${type.id}-max`}
                      type="number"
                      value={config.maxValue}
                      onChange={(e) => handleInputChange(type.id, "maxValue", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notification Dispatch Channels
                  </Label>
                  <div className="flex flex-wrap gap-6 pt-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${type.id}-chan-app`}
                        checked={config.notificationMethods.includes("in_app")}
                        onCheckedChange={(c) => handleMethodToggle(type.id, "in_app", !!c)}
                      />
                      <label htmlFor={`${type.id}-chan-app`} className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                        <Bell className="w-3.5 h-3.5 text-muted-foreground" /> In-App Badge
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${type.id}-chan-email`}
                        checked={config.notificationMethods.includes("email")}
                        onCheckedChange={(c) => handleMethodToggle(type.id, "email", !!c)}
                      />
                      <label htmlFor={`${type.id}-chan-email`} className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Summary
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${type.id}-chan-sms`}
                        checked={config.notificationMethods.includes("sms")}
                        onCheckedChange={(c) => handleMethodToggle(type.id, "sms", !!c)}
                      />
                      <label htmlFor={`${type.id}-chan-sms`} className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> SMS Push
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    className="bg-accent hover:bg-accent/90"
                    disabled={upsertMutation.isPending}
                    onClick={() => handleSave(type.id)}
                  >
                    {upsertMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <Save className="w-4 h-4 mr-1.5" />
                    )}
                    Apply Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
