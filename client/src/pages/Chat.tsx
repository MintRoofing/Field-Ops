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
import { Plus, Send, Users, User, UserPlus, UserMinus, Settings, Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function Chat() {
  const params = useParams();
  const boardId = params.boardId ? parseInt(params.boardId) : null;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [isCreateGeneralOpen, setIsCreateGeneralOpen] = useState(false);
  const [isCreatePrivateOpen, setIsCreatePrivateOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<any>(null);

  const isAdmin = (user as any)?.role === "admin";

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

  // Separate boards by type
  const generalChats = (boards as any[])?.filter((b: any) => b.type === 'general' || b.type === 'group') || [];
  const privateChats = (boards as any[])?.filter((b: any) => b.type === 'private' || b.type === 'direct') || [];

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
      setIsCreateGeneralOpen(false);
      setIsCreatePrivateOpen(false);
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

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const res = await apiRequest("DELETE", `/api/messages/${messageId}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetchMessages();
      toast({ title: "Message deleted" });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const res = await apiRequest("DELETE", `/api/boards/${boardId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      setSelectedBoard(null);
      toast({ title: "Chat deleted" });
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

  const handleCreateGeneralChat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const memberIds = Array.from(formData.getAll("members"));
    createBoardMutation.mutate({
      name: formData.get("name"),
      memberIds,
      type: "general",
    });
  };

  const handleCreatePrivateChat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const memberIds = Array.from(formData.getAll("members"));
    const selectedUsers = (users as any[])?.filter((u: any) => memberIds.includes(u.id));
    const chatName = selectedUsers?.map((u: any) => u.firstName).join(", ") || "Private Chat";
    createBoardMutation.mutate({
      name: chatName,
      memberIds,
      type: "private",
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
      <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          {/* General Chats Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 pr-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase flex items-center gap-2">
                <Users className="w-4 h-4" /> General
              </h3>
              <Dialog open={isCreateGeneralOpen} onOpenChange={setIsCreateGeneralOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost"><Plus className="w-4 h-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create General Chat</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateGeneralChat} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Chat Name</Label>
                      <Input id="name" name="name" required placeholder="e.g., Team Updates" />
                    </div>
                    <div className="space-y-2">
                      <Label>Add Members</Label>
                      <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-2">
                        {(users as any[])?.filter((u: any) => u.id !== (user as any)?.id).map((u: any) => (
                          <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox name="members" value={u.id} />
                            <span>{u.firstName} {u.lastName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createBoardMutation.isPending}>Create Chat</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2 pr-4">
              {generalChats.map((board: any) => (
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
              {generalChats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No general chats yet</p>
              )}
            </div>
          </div>

          {/* Private Chats Section */}
          <div>
            <div className="flex items-center justify-between mb-2 pr-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Private
              </h3>
              <Dialog open={isCreatePrivateOpen} onOpenChange={setIsCreatePrivateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost"><Plus className="w-4 h-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Private Chat</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreatePrivateChat} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Users</Label>
                      <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-2">
                        {(users as any[])?.filter((u: any) => u.id !== (user as any)?.id).map((u: any) => (
                          <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox name="members" value={u.id} />
                            <span>{u.firstName} {u.lastName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createBoardMutation.isPending}>Start Chat</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2 pr-4">
              {privateChats.map((board: any) => (
                <Card
                  key={board.id}
                  className={`p-3 cursor-pointer transition-colors ${selectedBoard?.id === board.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  onClick={() => setSelectedBoard(board)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{board.name}</h3>
                      <p className="text-xs text-muted-foreground">{board.members?.length || 0} members</p>
                    </div>
                  </div>
                </Card>
              ))}
              {privateChats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No private chats yet</p>
              )}
            </div>
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
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Settings className="w-4 h-4" /></Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Manage Members</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Current Members</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
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
                            <div className="space-y-2 max-h-40 overflow-y-auto">
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
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteBoardMutation.mutate(selectedBoard.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {(messages as any[])?.map((msg: any) => {
                  const isOwn = msg.senderId === (user as any)?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
                      <div className={`max-w-[70%] ${isOwn ? "bg-primary text-primary-foreground" : "bg-background"} rounded-lg p-3 relative`}>
                        {!isOwn && (
                          <p className="text-xs font-medium mb-1">{msg.sender?.firstName} {msg.sender?.lastName}</p>
                        )}
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </p>
                        {isAdmin && (
                          <button
                            onClick={() => deleteMessageMutation.mutate(msg.id)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full hidden group-hover:flex items-center justify-center"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
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
