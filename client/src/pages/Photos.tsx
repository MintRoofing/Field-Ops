import { usePhotos } from "@/hooks/use-photos";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { format } from "date-fns";

export default function Photos() {
  const { data: photos, isLoading } = usePhotos();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Project Photos</h1>
          <p className="text-muted-foreground">Document site progress with photos.</p>
        </div>
        <Button><Camera className="w-4 h-4 mr-2" /> Add Photo</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(photos as any[])?.map((photo: any) => (
          <Card key={photo.id} className="overflow-hidden">
            <div className="aspect-video bg-muted">
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <p className="text-sm">{photo.notes || "No notes"}</p>
              <p className="text-xs text-muted-foreground mt-2">{format(new Date(photo.createdAt), "MMM d, h:mm a")}</p>
            </div>
          </Card>
        ))}
        {(!photos || (photos as any[]).length === 0) && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No photos yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
