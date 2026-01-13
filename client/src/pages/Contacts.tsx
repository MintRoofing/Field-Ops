import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, User, Phone, Mail, Building, MapPin, Edit, Trash2, Image } from "lucide-react";
import { format } from "date-fns";

export default function Contacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const { data: contacts, isLoading } = useQuery({ queryKey: ["/api/contacts"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/contacts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setIsAddOpen(false);
      toast({ title: "Contact created" });
    },
    onError: () => {
      toast({ title: "Failed to create contact", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/contacts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setEditingContact(null);
      toast({ title: "Contact updated" });
    },
    onError: () => {
      toast({ title: "Failed to update contact", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/contacts/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setSelectedContact(null);
      toast({ title: "Contact deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete contact", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      company: formData.get("company"),
      address: formData.get("address"),
      notes: formData.get("notes"),
    };

    if (isEdit && editingContact) {
      updateMutation.mutate({ id: editingContact.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ContactForm = ({ contact, onSubmit, isPending }: { contact?: any; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; isPending: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" name="firstName" required defaultValue={contact?.firstName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" name="lastName" defaultValue={contact?.lastName} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={contact?.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={contact?.phone} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input id="company" name="company" defaultValue={contact?.company} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={contact?.address} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={contact?.notes} />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : contact ? "Update Contact" : "Create Contact"}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage customer contacts and link them to photos.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Contact</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Contact</DialogTitle></DialogHeader>
            <ContactForm onSubmit={(e) => handleSubmit(e, false)} isPending={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Contacts List */}
        <div className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {(contacts as any[])?.map((contact: any) => (
              <Card
                key={contact.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${selectedContact?.id === contact.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => setSelectedContact(contact)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {contact.firstName} {contact.lastName}
                    </h3>
                    {contact.company && (
                      <p className="text-sm text-muted-foreground truncate">{contact.company}</p>
                    )}
                    {contact.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {contact.phone}
                      </p>
                    )}
                  </div>
                  {contact.photos?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Image className="w-3 h-3" />
                      {contact.photos.length}
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {(!contacts || (contacts as any[]).length === 0) && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No contacts yet. Add your first contact to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Details */}
        <div>
          {selectedContact ? (
            <Card className="p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Contact Details</h2>
                <div className="flex gap-1">
                  <Dialog open={editingContact?.id === selectedContact.id} onOpenChange={(open) => !open && setEditingContact(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEditingContact(selectedContact)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
                      <ContactForm
                        contact={editingContact}
                        onSubmit={(e) => handleSubmit(e, true)}
                        isPending={updateMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(selectedContact.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">{selectedContact.firstName} {selectedContact.lastName}</h3>
                    {selectedContact.company && (
                      <p className="text-sm text-muted-foreground">{selectedContact.company}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {selectedContact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${selectedContact.email}`} className="text-primary hover:underline">
                        {selectedContact.email}
                      </a>
                    </div>
                  )}
                  {selectedContact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${selectedContact.phone}`} className="text-primary hover:underline">
                        {selectedContact.phone}
                      </a>
                    </div>
                  )}
                  {selectedContact.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedContact.address}</span>
                    </div>
                  )}
                </div>

                {selectedContact.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">{selectedContact.notes}</p>
                  </div>
                )}

                {selectedContact.photos?.length > 0 && (
                  <div className="pt-2 border-t">
                    <h4 className="font-medium text-sm mb-2">Photos ({selectedContact.photos.length})</h4>
                    <ScrollArea className="h-48">
                      <div className="grid grid-cols-2 gap-2">
                        {selectedContact.photos.map((photo: any) => (
                          <img
                            key={photo.id}
                            src={photo.url}
                            alt=""
                            className="rounded-lg w-full aspect-square object-cover cursor-pointer hover:opacity-80"
                            onClick={() => window.open(photo.url, "_blank")}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="pt-2 border-t text-xs text-muted-foreground">
                  Added {format(new Date(selectedContact.createdAt), "MMM d, yyyy")}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Select a contact to view details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
