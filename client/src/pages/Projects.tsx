import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { FolderPlus, Image, FileText, Camera, Pencil, Trash2, Upload, MessageSquare, Users, UserPlus, X, Send } from "lucide-react";
import { format } from "date-fns";

export default function Projects() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [editingPhoto, setEditingPhoto] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("photos");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = (user as any)?.role === "admin";

  const { data: projects, isLoading } = useQuery({ queryKey: ["/api/projects"] });
  const { data: photos } = useQuery({
    queryKey: ["/api/photos", selectedProject?.id],
    queryFn: async () => {
      const res = await fetch(`/api/photos?projectId=${selectedProject.id}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedProject,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsAddOpen(false);
      toast({ title: "Project created" });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/photos", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", selectedProject?.id] });
      toast({ title: "Photo uploaded" });
    },
  });

  const updatePhotoMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PUT", `/api/photos/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", selectedProject?.id] });
      setEditingPhoto(null);
      toast({ title: "Photo updated" });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/photos/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", selectedProject?.id] });
      toast({ title: "Photo deleted" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      uploadPhotoMutation.mutate({
        url: base64,
        projectId: selectedProject.id,
        fileType: file.type.includes("pdf") ? "pdf" : "image",
        notes: "",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createProjectMutation.mutate({
      name: formData.get("name"),
      description: formData.get("description"),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage project photos and documents</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><FolderPlus className="w-4 h-4 mr-2" /> New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <Button type="submit" className="w-full" disabled={createProjectMutation.isPending}>Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase">Projects</h3>
          {(projects as any[])?.map((project: any) => (
            <Card
              key={project.id}
              className={`p-3 cursor-pointer transition-colors ${selectedProject?.id === project.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
              onClick={() => setSelectedProject(project)}
            >
              <h4 className="font-medium">{project.name}</h4>
              <p className="text-xs text-muted-foreground">{project.photos?.length || 0} items</p>
              {project.members && project.members.length > 0 && (
                <div className="flex items-center mt-2 -space-x-2">
                  {project.members.slice(0, 4).map((member: any) => (
                    <div
                      key={member.userId}
                      className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px] font-medium"
                      title={`${member.user.firstName} ${member.user.lastName}`}
                    >
                      {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                    </div>
                  ))}
                  {project.members.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                      +{project.members.length - 4}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
          {(!projects || (projects as any[]).length === 0) && (
            <p className="text-sm text-muted-foreground">No projects yet</p>
          )}
        </div>

        <div className="lg:col-span-3">
          {selectedProject ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="photos" className="gap-2"><Image className="w-4 h-4" /> Photos</TabsTrigger>
                  <TabsTrigger value="chat" className="gap-2"><MessageSquare className="w-4 h-4" /> Chat</TabsTrigger>
                  {isAdmin && <TabsTrigger value="members" className="gap-2"><Users className="w-4 h-4" /> Members</TabsTrigger>}
                </TabsList>

                <TabsContent value="photos" className="space-y-4">
                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
                    <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Upload
                    </Button>
                    <Button variant="outline" onClick={() => cameraInputRef.current?.click()}>
                      <Camera className="w-4 h-4 mr-2" /> Take Photo
                    </Button>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(photos as any[])?.map((photo: any) => (
                      <Card key={photo.id} className="overflow-hidden">
                        <div className="aspect-video bg-muted relative">
                          {photo.fileType === "pdf" ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-12 h-12 text-muted-foreground" />
                            </div>
                          ) : (
                            <img src={photo.url} alt="" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button size="icon" variant="secondary" className="w-8 h-8" onClick={() => setEditingPhoto(photo)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="destructive" className="w-8 h-8" onClick={() => deletePhotoMutation.mutate(photo.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm">{photo.notes || "No notes"}</p>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(photo.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                      </Card>
                    ))}
                    {(!photos || (photos as any[]).length === 0) && (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Image className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No photos in this project yet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="chat">
                  <ProjectChat projectId={selectedProject.id} />
                </TabsContent>

                {isAdmin && (
                  <TabsContent value="members">
                    <ProjectMembers projectId={selectedProject.id} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              Select a project to view details
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editingPhoto} onOpenChange={() => setEditingPhoto(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Photo</DialogTitle></DialogHeader>
          {editingPhoto && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded overflow-hidden">
                <img src={editingPhoto.url} alt="" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingPhoto.notes || ""}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, notes: e.target.value })}
                  placeholder="Add notes about this photo..."
                />
              </div>
              <Button className="w-full" onClick={() => updatePhotoMutation.mutate({ id: editingPhoto.id, notes: editingPhoto.notes })}>
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectChat({ projectId }: { projectId: number }) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/messages`, { credentials: "include" });
      return res.json();
    },
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/messages`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "messages"] });
      setMessage("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-[300px]"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="border rounded-lg flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(messages as any[])?.length === 0 && (
          <div className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</div>
        )}
        {(messages as any[])?.map((msg: any) => {
          const isMe = msg.sender.id === (user as any)?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-lg px-3 py-2`}>
                {!isMe && <p className="text-xs font-medium mb-1">{msg.sender.firstName} {msg.sender.lastName}</p>}
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {format(new Date(msg.createdAt), "h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={sendMessageMutation.isPending}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

function ProjectMembers({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: members, isLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/members`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: allUsers } = useQuery({ queryKey: ["/api/users"] });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/members`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSelectedUserId("");
      toast({ title: "Member added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/projects/${projectId}/members/${userId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Member removed" });
    },
  });

  const memberIds = (members as any[])?.map(m => m.userId) || [];
  const availableUsers = (allUsers as any[])?.filter(u => !memberIds.includes(u.id)) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-[200px]"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select user to add" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((user: any) => (
              <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => selectedUserId && addMemberMutation.mutate(selectedUserId)} disabled={!selectedUserId || addMemberMutation.isPending}>
          <UserPlus className="w-4 h-4 mr-2" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {(members as any[])?.map((member: any) => (
          <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                {member.user.firstName?.[0]}{member.user.lastName?.[0]}
              </div>
              <div>
                <p className="font-medium text-sm">{member.user.firstName} {member.user.lastName}</p>
                <p className="text-xs text-muted-foreground">{member.user.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeMemberMutation.mutate(member.userId)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {(members as any[])?.length === 0 && (
          <p className="text-center text-muted-foreground py-4">No members yet</p>
        )}
      </div>
    </div>
  );
}
