import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FolderPlus, Image, FileText, Camera, Pencil, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";

export default function Projects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      setIsUploadOpen(false);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
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
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e)} />
                  <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, true)} />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Upload
                  </Button>
                  <Button variant="outline" onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" /> Take Photo
                  </Button>
                </div>
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
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              Select a project to view photos
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
