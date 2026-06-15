import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, History, CheckCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface AlertHistoryPanelProps {
  petId: number;
}

export default function AlertHistoryPanel({ petId }: AlertHistoryPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // 1. Hooking into tRPC endpoints defined inside your routers
  const { data: historyItems, isLoading, refetch } = trpc.alerts.getHistory.useQuery(
    { petId, limit: 100 },
    { enabled: !!petId }
  );

  const ackMutation = trpc.alerts.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast.success("Alert acknowledged.");
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Handle frontend filtering & sorting
  const filteredItems = (historyItems || []).filter((item: any) => {
    if (severityFilter === "all") return true;
    return item.severity === severityFilter;
  });

  // Basic client-side Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-destructive text-destructive-foreground flex gap-1 items-center"><ShieldAlert className="w-3 h-3"/> Critical</Badge>;
      case "high":
        return <Badge variant="destructive" className="flex gap-1 items-center"><AlertTriangle className="w-3 h-3"/> High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500 text-white flex gap-1 items-center"><AlertTriangle className="w-3 h-3"/> Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-accent" /> Historical Log Matrix
          </h3>
          <p className="text-sm text-muted-foreground">Review chronological alert streams and active system alerts.</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Severity Filter:</label>
          <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Log Feed List */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {paginatedItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No logged records match the specified search matrix parameters.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paginatedItems.map((alert: any) => (
              <div key={alert.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/30 transition-fast">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(alert.severity)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{alert.message}</p>
                  {alert.value && (
                    <p className="text-xs text-muted-foreground">
                      Captured reading value: <span className="font-mono text-foreground">{alert.value}</span>
                    </p>
                  )}
                </div>

                <div>
                  {alert.acknowledged === 1 ? (
                    <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Cleared / Acknowledged
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-border text-foreground hover:bg-muted"
                      onClick={() => ackMutation.mutate({ alertId: alert.id })}
                      disabled={ackMutation.isPending}
                    >
                      Dismiss Alert
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
