"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/http-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const branchSchema = z.object({
  slug: z.string().min(1).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case"),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().max(255).optional(),
  timezone: z.string().default("America/New_York"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface Branch {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  timezone: string;
  isActive: boolean;
  sortOrder: number;
}

const useToast = () => {
  const toast = (options: { title: string; description?: string; variant?: "default" | "destructive" }) => {
    if (options.variant === "destructive") {
      alert(`Error: ${options.title}\n${options.description || ""}`);
    } else {
      alert(`Success: ${options.title}\n${options.description || ""}`);
    }
  };
  return { toast };
};

export function BranchesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const response = await get<Branch[]>("/settings/branches");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BranchFormData) => {
      return await post("/settings/branches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setIsDialogOpen(false);
      toast({
        title: "Branch created",
        description: "The branch has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create branch",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: BranchFormData & { id: string }) => {
      return await put(`/settings/branches/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setIsDialogOpen(false);
      setEditingBranch(null);
      toast({
        title: "Branch updated",
        description: "The branch has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update branch",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await del(`/settings/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({
        title: "Branch deleted",
        description: "The branch has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete branch",
        variant: "destructive",
      });
    },
  });

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      slug: "",
      name: "",
      description: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      phone: "",
      email: "",
      website: "",
      timezone: "America/New_York",
      isActive: true,
      sortOrder: 0,
    },
    values: editingBranch
      ? {
          slug: editingBranch.slug,
          name: editingBranch.name,
          description: editingBranch.description || "",
          address: editingBranch.address || "",
          city: editingBranch.city || "",
          state: editingBranch.state || "",
          zipCode: editingBranch.zipCode || "",
          country: editingBranch.country || "",
          phone: editingBranch.phone || "",
          email: editingBranch.email || "",
          website: editingBranch.website || "",
          timezone: editingBranch.timezone,
          isActive: editingBranch.isActive,
          sortOrder: editingBranch.sortOrder,
        }
      : undefined,
  });

  const onSubmit = (data: BranchFormData) => {
    if (editingBranch) {
      updateMutation.mutate({ ...data, id: editingBranch.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this branch?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNew = () => {
    setEditingBranch(null);
    form.reset();
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Branches</CardTitle>
            <CardDescription>
              Manage your organization's branches and locations.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? "Edit Branch" : "Create Branch"}
                </DialogTitle>
                <DialogDescription>
                  {editingBranch
                    ? "Update branch information"
                    : "Add a new branch to your organization"}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Slug</label>
                    <Input
                      {...form.register("slug")}
                      placeholder="main-branch"
                    />
                    {form.formState.errors.slug && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.slug.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input {...form.register("name")} placeholder="Main Branch" />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    {...form.register("description")}
                    placeholder="Branch description..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    {...form.register("address")}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input {...form.register("city")} placeholder="New York" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <Input {...form.register("state")} placeholder="NY" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ZIP Code</label>
                    <Input {...form.register("zipCode")} placeholder="10001" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <Input {...form.register("country")} placeholder="USA" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Timezone</label>
                    <Input
                      {...form.register("timezone")}
                      placeholder="America/New_York"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      {...form.register("phone")}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      {...form.register("email")}
                      placeholder="branch@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      {...form.register("website")}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingBranch ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {branches && branches.length > 0 ? (
          <div className="space-y-4">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{branch.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {branch.slug} {branch.city && `• ${branch.city}`}
                    {branch.state && `, ${branch.state}`}
                  </p>
                  {branch.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {branch.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(branch)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(branch.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No branches yet. Create your first branch to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

