import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";

export default function TimeTracking() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewPeriod, setViewPeriod] = useState<string>("month");

  const { data: users } = useQuery({ queryKey: ["/api/users"] });
  const { data: calendarData } = useQuery({
    queryKey: ["/api/admin/time-cards/calendar", currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: async () => {
      const res = await fetch(`/api/admin/time-cards/calendar?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`, { credentials: "include" });
      return res.json();
    },
  });
  const { data: userTimeData } = useQuery({
    queryKey: ["/api/admin/time-cards/user", selectedUserId, viewPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/time-cards/user/${selectedUserId}?period=${viewPeriod}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedUserId,
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();

  const getTimeCardsForDay = (day: Date) => {
    if (!calendarData) return [];
    return (calendarData as any[]).filter((card: any) => isSameDay(new Date(card.startTime), day));
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Time Tracking</h1>
        <p className="text-muted-foreground">View employee clock-in history and hours</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
              <h2 className="text-lg font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
              <Button variant="ghost" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-2 font-medium text-muted-foreground">{d}</div>
              ))}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2" />
              ))}
              {days.map((day) => {
                const dayCards = getTimeCardsForDay(day);
                const uniqueUsers = [...new Set(dayCards.map((c: any) => c.userId))];
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 min-h-[80px] border rounded-lg ${isSameMonth(day, currentDate) ? "bg-background" : "bg-muted/50"}`}
                  >
                    <div className="font-medium text-sm">{format(day, "d")}</div>
                    {uniqueUsers.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {uniqueUsers.slice(0, 3).map((userId: any) => {
                          const userCards = dayCards.filter((c: any) => c.userId === userId);
                          const user = userCards[0]?.user;
                          const totalHours = userCards.reduce((sum: number, c: any) => sum + (c.totalHours || 0), 0);
                          return (
                            <div
                              key={userId}
                              className="text-xs bg-primary/10 text-primary px-1 py-0.5 rounded truncate cursor-pointer hover:bg-primary/20"
                              onClick={() => setSelectedUserId(userId)}
                            >
                              {user?.firstName?.[0]}{user?.lastName?.[0]} {totalHours.toFixed(1)}h
                            </div>
                          );
                        })}
                        {uniqueUsers.length > 3 && (
                          <div className="text-xs text-muted-foreground">+{uniqueUsers.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Employee Details</h3>
            <Select value={selectedUserId || ""} onValueChange={setSelectedUserId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {(users as any[])?.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {selectedUserId && userTimeData && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Time Summary</h3>
                <Select value={viewPeriod} onValueChange={setViewPeriod}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-3xl font-bold text-primary mb-4">{userTimeData.totalHours?.toFixed(2) || 0} hours</div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {userTimeData.cards?.map((card: any) => (
                  <div key={card.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{format(new Date(card.startTime), "MMM d, yyyy")}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(card.startTime), "h:mm a")} - {card.endTime ? format(new Date(card.endTime), "h:mm a") : "Active"}
                      </div>
                    </div>
                    <div className="text-sm font-medium">{card.totalHours?.toFixed(2) || "-"}h</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
