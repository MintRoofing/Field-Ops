import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Send, Users, UserPlus, UserMinus, Settings } from "lucide-react";
import { format } from "date-fns";

export default function Chat() {
  const params = useParams();
  const boardId = params.boardId ? parseInt(params.boardId) : null;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<any>(null);

  const isAdmin = user?.role === "admin";

  const { data: boards } = useQuery({ queryKey: ["/api/boards"] });
  const { data: users } = useQuery({ queryKey: ["/api/users"] });
  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["/api/boards", selectedBoard?.id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${selectedBoard.id}/messages`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedBoard,
    refetchInterval: 5000,
  });
  const { data: members } = useQuery({
    queryKey: ["/api/boards", selectedBoard?.id, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${selectedBoard.id}/members`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedBoard,
  });

  useEffect(() => {
    if (boardId && boards) {
      const board = (boards as any[]).find((b: any) => b.id === boardId);
      if (board) setSelectedBoard(board);
    }
  }, [boardId, boards]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createBoardMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/boards", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      setIsCreateOpen(false);
      toast({ title: "Chat created" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: () => {
      refetchMessages();
      setMessage("");
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/boards/${selectedBoard.id}/members`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", selectedBoard?.id, "members"] });
      toast({ title: "Member added" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/boards/${selectedBoard.id}/members/${userId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", selectedBoard?.id, "members"] });
      toast({ title: "Member removed" });
    },
  });

  const handleCreateBoard = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const memberIds = Array.from(formData.getAll("members"));
    createBoardMutation.mutate({
      name: formData.get("name"),
      memberIds,
      allowUserEditing: formData.get("allowUserEditing") === "on",
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedBoard) return;
    sendMessageMutation.mutate({ boardId: selectedBoard.id, content: message });
  };

  const memberIds = members?.map((m: any) => m.userId) || [];

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Boards list */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Chats</h2>
          {isAdmin && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4" /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Group Chat</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateBoard} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Chat Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Members</Label>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-2">
                      {(users as any[])?.map((u: any) => (
                        <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox name="members" value={u.id} />
                          <span>{u.firstName} {u.lastName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox name="allowUserEditing" />
                    <span className="text-sm">Allow members to edit photos</span>
                  </label>
                  <Button type="submit" className="w-full">Create Chat</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {(boards as any[])?.map((board: any) => (
              <Card
                key={board.id}
                className={`p-3 cursor-pointer transition-colors ${selectedBoard?.id === board.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                onClick={() => setSelectedBoard(board)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{board.name}</h3>
                    <p className="text-xs text-muted-foreground">{board.members?.length || 0} members</p>
                  </div>
                </div>
              </Card>
            ))}
            {(!boards || (boards as any[]).length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No chats yet</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-muted/30 rounded-lg">
        {selectedBoard ? (
          <>
            <div className="p-4 border-b bg-background rounded-t-lg flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{selectedBoard.name}</h2>
                <p className="text-sm text-muted-foreground">{members?.length || 0} members</p>
              </div>
              {isAdmin && (
                <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon"><Settings className="w-4 h-4" /></Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Manage Members</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Current Members</h4>
                        <div className="space-y-2">
                          {members?.map((member: any) => (
                            <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span>{member.user?.firstName} {member.user?.lastName}</span>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeMemberMutation.mutate(member.userId)}>
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Add Members</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {(users as any[])?.filter((u: any) => !memberIds.includes(u.id)).map((u: any) => (
                            <div key={u.id} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span>{u.firstName} {u.lastName}</span>
                              <Button variant="ghost" size="sm" onClick={() => addMemberMutation.mutate(u.id)}>
                                <UserPlus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {(messages as any[])?.map((msg: any) => {
                  const isOwn = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] ${isOwn ? "bg-primary text-primary-foreground" : "bg-background"} rounded-lg p-3`}>
                        {!isOwn && (
                          <p className="text-xs font-medium mb-1">{msg.sender?.firstName} {msg.sender?.lastName}</p>
                        )}
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t bg-background rounded-b-lg flex gap-2">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button type="submit" size="icon" disabled={!message.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
