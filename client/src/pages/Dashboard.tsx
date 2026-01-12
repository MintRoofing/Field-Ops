import { useTimeCardStatus, useClockIn, useClockOut } from "@/hooks/use-time-cards";
import { useLocationSync } from "@/hooks/use-locations";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Clock, UserPlus, Shield, ShieldOff, Trash2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { differenceInSeconds, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: status, isLoading } = useTimeCardStatus();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const [elapsed, setElapsed] = useState(0);
  const isAdmin = (user as any)?.role === "admin";

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
        <p className="text-muted-foreground">
          {isAdmin ? "Admin Dashboard - Manage your team below." : "Here's your activity for today."}
        </p>
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

      {isAdmin && (
        <>
          <AdminUsersSection />
          <AdminTimeTrackingSection />
        </>
      )}
    </div>
  );
}

function AdminUsersSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState("");

  const { data: users, isLoading } = useQuery({ queryKey: ["/api/users"] });

  const addUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddOpen(false);
      toast({ title: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await apiRequest("PUT", `/api/users/${id}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role updated" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`, { adminPassword });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteUserId(null);
      setAdminPassword("");
      toast({ title: "User deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addUserMutation.mutate({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role") || "user",
    });
  };

  if (isLoading) {
    return <Card className="p-6"><div className="flex items-center justify-center"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> User Management</CardTitle>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="w-4 h-4 mr-2" /> Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" defaultValue="user">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={addUserMutation.isPending}>
                  {addUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {(users as any[])?.map((user: any) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{user.firstName} {user.lastName}</h3>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {user.role}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {user.role === 'admin' ? (
                  <Button variant="ghost" size="sm" onClick={() => updateRoleMutation.mutate({ id: user.id, role: 'user' })}>
                    <ShieldOff className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => updateRoleMutation.mutate({ id: user.id, role: 'admin' })}>
                    <Shield className="w-4 h-4" />
                  </Button>
                )}
                <Dialog open={deleteUserId === user.id} onOpenChange={(open) => !open && setDeleteUserId(null)}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteUserId(user.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
                    <p className="text-muted-foreground">Enter your admin password to confirm deletion of {user.firstName} {user.lastName}.</p>
                    <Input type="password" placeholder="Admin password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setDeleteUserId(null)}>Cancel</Button>
                      <Button variant="destructive" onClick={() => deleteUserMutation.mutate(user.id)} disabled={deleteUserMutation.isPending}>
                        {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminTimeTrackingSection() {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Time Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                <h2 className="text-lg font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
                <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
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
                            const userInfo = userCards[0]?.user;
                            const totalHours = userCards.reduce((sum: number, c: any) => sum + (c.totalHours || 0), 0);
                            return (
                              <div
                                key={userId}
                                className="text-xs bg-primary/10 text-primary px-1 py-0.5 rounded truncate cursor-pointer hover:bg-primary/20"
                                onClick={() => setSelectedUserId(userId)}
                              >
                                {userInfo?.firstName?.[0]}{userInfo?.lastName?.[0]} {totalHours.toFixed(1)}h
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
            </div>
          </div>

          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Employee Details</h3>
              <Select value={selectedUserId || ""} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {(users as any[])?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUserId && userTimeData && (
              <div className="border rounded-lg p-4">
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
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
