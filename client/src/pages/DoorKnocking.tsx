import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, useMap, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Users,
  Save,
  X,
  Calendar,
  Clock,
  Phone,
  Mail,
  Home,
  UserPlus,
  Pencil,
  Check,
  AlertCircle,
  Bell,
} from "lucide-react";

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom pin icons by status
const pinIcons: Record<string, L.Icon> = {
  not_contacted: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6b7280" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }),
  maybe: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#eab308" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }),
  urgent: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }),
  cold_lead: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1e40af" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }),
  sold: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#22c55e" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }),
  angry: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#171717" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }),
};

const statusLabels: Record<string, string> = {
  not_contacted: "Not Contacted",
  maybe: "Maybe",
  urgent: "Urgent / On the Fence",
  cold_lead: "Cold Lead / Not Interested",
  sold: "Sold",
  angry: "Angry / Do Not Contact",
};

const statusColors: Record<string, string> = {
  not_contacted: "bg-gray-500",
  maybe: "bg-yellow-500",
  urgent: "bg-red-500",
  cold_lead: "bg-blue-800",
  sold: "bg-green-500",
  angry: "bg-neutral-900",
};

interface Territory {
  id: number;
  name: string;
  description?: string;
  boundaries: { lat: number; lng: number }[];
  color: string;
  createdBy: string;
  assignments?: { user: { id: string; firstName: string; lastName: string } }[];
}

interface DoorPin {
  id: number;
  territoryId: number;
  lat: number;
  lng: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  status: string;
  notes?: string;
  createdBy: string;
  assignedTo?: string;
  appointmentDate?: string;
  appointmentNotes?: string;
  reminderDate?: string;
  creator?: { id: string; firstName: string; lastName: string };
  assignee?: { id: string; firstName: string; lastName: string };
  territory?: Territory;
}

// Map click handler component
function MapClickHandler({
  onMapClick,
  isDrawing,
  onDrawPoint,
}: {
  onMapClick: (lat: number, lng: number) => void;
  isDrawing: boolean;
  onDrawPoint: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (isDrawing) {
        onDrawPoint(e.latlng.lat, e.latlng.lng);
      } else {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Component to fit map to territories
function FitBoundsToTerritories({ territories }: { territories: Territory[] }) {
  const map = useMap();

  useEffect(() => {
    if (territories.length > 0) {
      const allPoints: [number, number][] = [];
      territories.forEach((t) => {
        t.boundaries.forEach((p) => allPoints.push([p.lat, p.lng]));
      });
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [territories, map]);

  return null;
}

export default function DoorKnocking() {
  const { user } = useAuth() as { user: User | null; isLoading: boolean };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  const defaultCenter: [number, number] = [40.7128, -74.006];

  // State
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [selectedPin, setSelectedPin] = useState<DoorPin | null>(null);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [isNewPinMode, setIsNewPinMode] = useState(false);
  const [newPinLocation, setNewPinLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Admin state
  const [isDrawingTerritory, setIsDrawingTerritory] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [isTerritoryDialogOpen, setIsTerritoryDialogOpen] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [territoryForm, setTerritoryForm] = useState({ name: "", description: "", color: "#3b82f6" });
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");

  // Pin form state
  const [pinForm, setPinForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    address: "",
    status: "not_contacted",
    notes: "",
    assignedTo: "",
    appointmentDate: "",
    appointmentNotes: "",
    reminderDate: "",
  });

  // Queries - using default queryFn for GET requests
  const { data: territories = [], isLoading: territoriesLoading } = useQuery<Territory[]>({
    queryKey: ["/api/territories"],
  });

  const { data: pins = [] } = useQuery<DoorPin[]>({
    queryKey: selectedTerritory
      ? [`/api/door-pins?territoryId=${selectedTerritory.id}`]
      : ["/api/door-pins"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: reminders = [] } = useQuery<DoorPin[]>({
    queryKey: ["/api/door-pins/reminders"],
  });

  // Mutations
  const createTerritoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/territories", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territories"] });
      toast({ title: "Territory created successfully" });
      setIsTerritoryDialogOpen(false);
      resetTerritoryForm();
    },
    onError: (error: any) => {
      toast({ title: "Error creating territory", description: error.message, variant: "destructive" });
    },
  });

  const updateTerritoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/territories/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territories"] });
      toast({ title: "Territory updated successfully" });
      setIsTerritoryDialogOpen(false);
      resetTerritoryForm();
    },
    onError: (error: any) => {
      toast({ title: "Error updating territory", description: error.message, variant: "destructive" });
    },
  });

  const deleteTerritoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/territories/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/door-pins"] });
      toast({ title: "Territory deleted successfully" });
      setSelectedTerritory(null);
    },
    onError: (error: any) => {
      toast({ title: "Error deleting territory", description: error.message, variant: "destructive" });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({ territoryId, userId }: { territoryId: number; userId: string }) => {
      const res = await apiRequest("POST", `/api/territories/${territoryId}/assignments`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territories"] });
      toast({ title: "User assigned successfully" });
      setIsAssignDialogOpen(false);
      setAssignUserId("");
    },
    onError: (error: any) => {
      toast({ title: "Error assigning user", description: error.message, variant: "destructive" });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ territoryId, userId }: { territoryId: number; userId: string }) => {
      const res = await apiRequest("DELETE", `/api/territories/${territoryId}/assignments/${userId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territories"] });
      toast({ title: "Assignment removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error removing assignment", description: error.message, variant: "destructive" });
    },
  });

  const createPinMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/door-pins", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/door-pins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/door-pins/reminders"] });
      toast({ title: "Pin created successfully" });
      setIsPinDialogOpen(false);
      resetPinForm();
      setNewPinLocation(null);
      setIsNewPinMode(false);
    },
    onError: (error: any) => {
      toast({ title: "Error creating pin", description: error.message, variant: "destructive" });
    },
  });

  const updatePinMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/door-pins/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/door-pins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/door-pins/reminders"] });
      toast({ title: "Pin updated successfully" });
      setIsPinDialogOpen(false);
      setSelectedPin(null);
      resetPinForm();
    },
    onError: (error: any) => {
      toast({ title: "Error updating pin", description: error.message, variant: "destructive" });
    },
  });

  const deletePinMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/door-pins/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/door-pins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/door-pins/reminders"] });
      toast({ title: "Pin deleted successfully" });
      setIsPinDialogOpen(false);
      setSelectedPin(null);
    },
    onError: (error: any) => {
      toast({ title: "Error deleting pin", description: error.message, variant: "destructive" });
    },
  });

  // Helpers
  const resetTerritoryForm = () => {
    setTerritoryForm({ name: "", description: "", color: "#3b82f6" });
    setDrawingPoints([]);
    setIsDrawingTerritory(false);
    setEditingTerritory(null);
  };

  const resetPinForm = () => {
    setPinForm({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      address: "",
      status: "not_contacted",
      notes: "",
      assignedTo: "",
      appointmentDate: "",
      appointmentNotes: "",
      reminderDate: "",
    });
  };

  // Check if point is inside a territory polygon
  const isPointInTerritory = useCallback((lat: number, lng: number, boundaries: { lat: number; lng: number }[]) => {
    let inside = false;
    for (let i = 0, j = boundaries.length - 1; i < boundaries.length; j = i++) {
      const xi = boundaries[i].lat,
        yi = boundaries[i].lng;
      const xj = boundaries[j].lat,
        yj = boundaries[j].lng;
      const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Find which territory a point belongs to
  const findTerritoryForPoint = useCallback(
    (lat: number, lng: number) => {
      return territories.find((t) => isPointInTerritory(lat, lng, t.boundaries));
    },
    [territories, isPointInTerritory]
  );

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    if (isNewPinMode) {
      const territory = findTerritoryForPoint(lat, lng);
      if (territory) {
        setNewPinLocation({ lat, lng });
        setSelectedTerritory(territory);
        setPinForm((prev) => ({ ...prev, assignedTo: user?.id || "" }));
        setIsPinDialogOpen(true);
      } else if (territories.length === 0) {
        toast({
          title: "No territories",
          description: "An admin needs to draw territories first before pins can be dropped",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Outside territory",
          description: "Please click inside a territory boundary to drop a pin",
          variant: "destructive",
        });
      }
    }
  };

  // Handle draw point
  const handleDrawPoint = (lat: number, lng: number) => {
    setDrawingPoints((prev) => [...prev, { lat, lng }]);
  };

  // Handle pin click
  const handlePinClick = (pin: DoorPin) => {
    setSelectedPin(pin);
    setPinForm({
      customerName: pin.customerName || "",
      customerPhone: pin.customerPhone || "",
      customerEmail: pin.customerEmail || "",
      address: pin.address || "",
      status: pin.status || "not_contacted",
      notes: pin.notes || "",
      assignedTo: pin.assignedTo || "",
      appointmentDate: pin.appointmentDate ? new Date(pin.appointmentDate).toISOString().slice(0, 16) : "",
      appointmentNotes: pin.appointmentNotes || "",
      reminderDate: pin.reminderDate ? new Date(pin.reminderDate).toISOString().slice(0, 16) : "",
    });
    setIsPinDialogOpen(true);
  };

  // Save territory
  const handleSaveTerritory = () => {
    if (!territoryForm.name.trim()) {
      toast({ title: "Please enter a territory name", variant: "destructive" });
      return;
    }

    if (editingTerritory) {
      updateTerritoryMutation.mutate({
        id: editingTerritory.id,
        data: {
          ...territoryForm,
          boundaries: drawingPoints.length >= 3 ? drawingPoints : editingTerritory.boundaries,
        },
      });
    } else {
      if (drawingPoints.length < 3) {
        toast({ title: "Please draw at least 3 points for the territory boundary", variant: "destructive" });
        return;
      }
      createTerritoryMutation.mutate({
        ...territoryForm,
        boundaries: drawingPoints,
      });
    }
  };

  // Save pin
  const handleSavePin = () => {
    if (selectedPin) {
      updatePinMutation.mutate({
        id: selectedPin.id,
        data: pinForm,
      });
    } else if (newPinLocation && selectedTerritory) {
      createPinMutation.mutate({
        ...pinForm,
        territoryId: selectedTerritory.id,
        lat: newPinLocation.lat,
        lng: newPinLocation.lng,
      });
    }
  };

  // Edit territory
  const handleEditTerritory = (territory: Territory) => {
    setEditingTerritory(territory);
    setTerritoryForm({
      name: territory.name,
      description: territory.description || "",
      color: territory.color || "#3b82f6",
    });
    setDrawingPoints(territory.boundaries);
    setIsTerritoryDialogOpen(true);
  };

  // Filtered pins based on selected territory
  const visiblePins = useMemo(() => {
    if (selectedTerritory) {
      return pins.filter((p) => p.territoryId === selectedTerritory.id);
    }
    return pins;
  }, [pins, selectedTerritory]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: pins.length,
      notContacted: pins.filter((p) => p.status === "not_contacted").length,
      maybe: pins.filter((p) => p.status === "maybe").length,
      urgent: pins.filter((p) => p.status === "urgent").length,
      coldLead: pins.filter((p) => p.status === "cold_lead").length,
      sold: pins.filter((p) => p.status === "sold").length,
      angry: pins.filter((p) => p.status === "angry").length,
    };
  }, [pins]);

  if (territoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Door Knocking</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage territories and track door-to-door sales" : "Your assigned territories"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={isNewPinMode ? "default" : "outline"}
            onClick={() => {
              setIsNewPinMode(!isNewPinMode);
              setIsDrawingTerritory(false);
              setDrawingPoints([]);
            }}
          >
            <MapPin className="w-4 h-4 mr-2" />
            {isNewPinMode ? "Cancel Pin" : "Drop Pin"}
          </Button>
          {isAdmin && (
            <>
              <Button
                variant={isDrawingTerritory ? "default" : "outline"}
                onClick={() => {
                  if (!isDrawingTerritory) {
                    // Start drawing mode
                    setIsDrawingTerritory(true);
                    setIsNewPinMode(false);
                    setDrawingPoints([]);
                  } else {
                    // Cancel drawing mode
                    setIsDrawingTerritory(false);
                    setDrawingPoints([]);
                  }
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                {isDrawingTerritory ? "Cancel Drawing" : "Draw Territory"}
              </Button>
              {isDrawingTerritory && drawingPoints.length >= 3 && (
                <Button
                  variant="default"
                  onClick={() => setIsTerritoryDialogOpen(true)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Territory ({drawingPoints.length} points)
                </Button>
              )}
              {isDrawingTerritory && drawingPoints.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setDrawingPoints((prev) => prev.slice(0, -1))}
                >
                  Undo Point
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Instructions banner */}
      {(isNewPinMode || isDrawingTerritory) && (
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {isNewPinMode
            ? `Click on the map within a territory to drop a pin. ${territories.length === 0 ? "(No territories exist yet - admin needs to draw one first)" : ""}`
            : `Click anywhere on the map to add boundary points. You have ${drawingPoints.length} point${drawingPoints.length !== 1 ? "s" : ""}. Need at least 3 to save.`}
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Stats Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pin Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors.not_contacted}`} />
                  <span>Not Contacted: {stats.notContacted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors.maybe}`} />
                  <span>Maybe: {stats.maybe}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors.urgent}`} />
                  <span>Urgent: {stats.urgent}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors.cold_lead}`} />
                  <span>Cold Lead: {stats.coldLead}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors.sold}`} />
                  <span>Sold: {stats.sold}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors.angry}`} />
                  <span>Angry: {stats.angry}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Reminders */}
          {reminders.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Upcoming Reminders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {reminders.slice(0, 5).map((pin) => (
                    <div
                      key={pin.id}
                      className="text-sm p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                      onClick={() => handlePinClick(pin)}
                    >
                      <div className="font-medium">{pin.customerName || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">
                        {pin.appointmentDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(pin.appointmentDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Territories List */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Territories</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                <Button
                  variant={selectedTerritory === null ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedTerritory(null)}
                >
                  All Territories
                </Button>
                {territories.map((territory) => (
                  <div
                    key={territory.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTerritory?.id === territory.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedTerritory(territory)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: territory.color || "#3b82f6" }}
                        />
                        <span className="font-medium">{territory.name}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTerritory(territory);
                              setIsAssignDialogOpen(true);
                            }}
                          >
                            <UserPlus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTerritory(territory);
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this territory and all its pins?")) {
                                deleteTerritoryMutation.mutate(territory.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {territory.assignments && territory.assignments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {territory.assignments.map((a: any) => (
                          <span
                            key={a.user.id}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full flex items-center gap-1"
                          >
                            {a.user.firstName} {a.user.lastName}
                            {isAdmin && (
                              <X
                                className="w-3 h-3 cursor-pointer hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAssignmentMutation.mutate({
                                    territoryId: territory.id,
                                    userId: a.user.id,
                                  });
                                }}
                              />
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="flex-1 rounded-2xl overflow-hidden border">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler
              onMapClick={handleMapClick}
              isDrawing={isDrawingTerritory}
              onDrawPoint={handleDrawPoint}
            />
            <FitBoundsToTerritories territories={territories} />

            {/* Territory polygons */}
            {territories.map((territory) => (
              <Polygon
                key={territory.id}
                positions={territory.boundaries.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  color: territory.color || "#3b82f6",
                  fillColor: territory.color || "#3b82f6",
                  fillOpacity: selectedTerritory?.id === territory.id ? 0.3 : 0.1,
                  weight: selectedTerritory?.id === territory.id ? 3 : 1,
                }}
                eventHandlers={{
                  click: (e) => {
                    if (isNewPinMode) {
                      // When in pin drop mode, create a pin at click location
                      setNewPinLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
                      setSelectedTerritory(territory);
                      setPinForm((prev) => ({ ...prev, assignedTo: user?.id || "" }));
                      setIsPinDialogOpen(true);
                    } else if (isDrawingTerritory) {
                      // When drawing, add point
                      setDrawingPoints((prev) => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="font-semibold">{territory.name}</div>
                  {territory.description && <div className="text-sm">{territory.description}</div>}
                </Popup>
              </Polygon>
            ))}

            {/* Drawing preview polygon */}
            {isDrawingTerritory && drawingPoints.length > 0 && (
              <Polygon
                positions={drawingPoints.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  color: territoryForm.color,
                  fillColor: territoryForm.color,
                  fillOpacity: 0.2,
                  dashArray: "5, 5",
                }}
              />
            )}

            {/* Drawing points markers */}
            {isDrawingTerritory &&
              drawingPoints.map((point, index) => (
                <CircleMarker
                  key={index}
                  center={[point.lat, point.lng]}
                  radius={8}
                  pathOptions={{
                    color: "#fff",
                    fillColor: territoryForm.color,
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Popup>Point {index + 1}</Popup>
                </CircleMarker>
              ))}

            {/* Door pins */}
            {visiblePins.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={pinIcons[pin.status] || pinIcons.not_contacted}
                eventHandlers={{
                  click: () => handlePinClick(pin),
                }}
              >
                <Popup>
                  <div className="min-w-[150px]">
                    <div className="font-semibold">{pin.customerName || "No name"}</div>
                    <div className="text-sm text-muted-foreground">{pin.address || "No address"}</div>
                    <div className={`text-xs mt-1 px-2 py-0.5 rounded inline-block text-white ${statusColors[pin.status]}`}>
                      {statusLabels[pin.status]}
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => handlePinClick(pin)}
                    >
                      View Details
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* New pin preview */}
            {newPinLocation && (
              <Marker position={[newPinLocation.lat, newPinLocation.lng]}>
                <Popup>New Pin Location</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>

      {/* Territory Dialog */}
      <Dialog open={isTerritoryDialogOpen} onOpenChange={setIsTerritoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTerritory ? "Edit Territory" : "Create Territory"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="territory-name">Name</Label>
              <Input
                id="territory-name"
                value={territoryForm.name}
                onChange={(e) => setTerritoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Territory name"
              />
            </div>
            <div>
              <Label htmlFor="territory-description">Description</Label>
              <Textarea
                id="territory-description"
                value={territoryForm.description}
                onChange={(e) => setTerritoryForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label htmlFor="territory-color">Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="territory-color"
                  value={territoryForm.color}
                  onChange={(e) => setTerritoryForm((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={territoryForm.color}
                  onChange={(e) => setTerritoryForm((prev) => ({ ...prev, color: e.target.value }))}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {drawingPoints.length} boundary points drawn
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsTerritoryDialogOpen(false); resetTerritoryForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveTerritory} disabled={createTerritoryMutation.isPending || updateTerritoryMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {editingTerritory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to {selectedTerritory?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="assign-user">Select User</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(
                      (u) =>
                        !selectedTerritory?.assignments?.some((a: any) => a.user.id === u.id)
                    )
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTerritory && assignUserId) {
                  assignUserMutation.mutate({ territoryId: selectedTerritory.id, userId: assignUserId });
                }
              }}
              disabled={!assignUserId || assignUserMutation.isPending}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pin Dialog */}
      <Dialog open={isPinDialogOpen} onOpenChange={(open) => { setIsPinDialogOpen(open); if (!open) { setSelectedPin(null); setNewPinLocation(null); resetPinForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPin ? "Edit Pin" : "New Pin"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customer">Customer Info</TabsTrigger>
              <TabsTrigger value="status">Status & Notes</TabsTrigger>
              <TabsTrigger value="appointment">Appointment</TabsTrigger>
            </TabsList>

            <TabsContent value="customer" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="customer-name">Customer Name</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-name"
                    value={pinForm.customerName}
                    onChange={(e) => setPinForm((prev) => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Full name"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customer-phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-phone"
                    value={pinForm.customerPhone}
                    onChange={(e) => setPinForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="Phone number"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customer-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-email"
                    type="email"
                    value={pinForm.customerEmail}
                    onChange={(e) => setPinForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="Email address"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customer-address">Address</Label>
                <div className="relative">
                  <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-address"
                    value={pinForm.address}
                    onChange={(e) => setPinForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Street address"
                    className="pl-10"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="status" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="pin-status">Status</Label>
                <Select
                  value={pinForm.status}
                  onValueChange={(value) => setPinForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${statusColors[value]}`} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pin-notes">Notes</Label>
                <Textarea
                  id="pin-notes"
                  value={pinForm.notes}
                  onChange={(e) => setPinForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this contact..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="pin-assignee">Assigned To</Label>
                <Select
                  value={pinForm.assignedTo}
                  onValueChange={(value) => setPinForm((prev) => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="appointment" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="appointment-date">Appointment Date & Time</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="appointment-date"
                    type="datetime-local"
                    value={pinForm.appointmentDate}
                    onChange={(e) => setPinForm((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="appointment-notes">Appointment Notes</Label>
                <Textarea
                  id="appointment-notes"
                  value={pinForm.appointmentNotes}
                  onChange={(e) => setPinForm((prev) => ({ ...prev, appointmentNotes: e.target.value }))}
                  placeholder="Notes for the appointment..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="reminder-date">Reminder Date & Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reminder-date"
                    type="datetime-local"
                    value={pinForm.reminderDate}
                    onChange={(e) => setPinForm((prev) => ({ ...prev, reminderDate: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between mt-4">
            {selectedPin && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Delete this pin?")) {
                    deletePinMutation.mutate(selectedPin.id);
                  }
                }}
                disabled={deletePinMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setIsPinDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSavePin}
                disabled={createPinMutation.isPending || updatePinMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {selectedPin ? "Update" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
