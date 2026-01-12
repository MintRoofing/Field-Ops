import { useTimeCardStatus, useClockIn, useClockOut } from "@/hooks/use-time-cards";
import { useLocationSync } from "@/hooks/use-locations";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: status, isLoading } = useTimeCardStatus();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const [elapsed, setElapsed] = useState(0);

  useLocationSync(!!(status as any)?.active);

  useEffect(() => {
    if (!(status as any)?.active || !(status as any)?.currentSession?.startTime) {
      setElapsed(0);
      return;
    }
    const startTime = new Date((status as any).currentSession.startTime);
    const interval = setInterval(() => {
      setElapsed(differenceInSeconds(new Date(), startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Good Morning, {(user as any)?.firstName}</h1>
        <p className="text-muted-foreground">Here's your activity for today.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Time Card</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          <div className="text-6xl font-mono font-bold mb-8">{formatDuration(elapsed)}</div>
          {!(status as any)?.active ? (
            <Button size="lg" className="w-full max-w-xs h-16 text-xl" onClick={() => clockIn.mutate()} disabled={clockIn.isPending}>
              <Play className="w-6 h-6 mr-3" /> Clock In
            </Button>
          ) : (
            <Button size="lg" variant="destructive" className="w-full max-w-xs h-16 text-xl" onClick={() => clockOut.mutate()} disabled={clockOut.isPending}>
              <Square className="w-6 h-6 mr-3" /> Clock Out
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
