import { useState } from "react";
import { Plus, Check, Menu, LogOut, FileText, MoreVertical, Pencil, Trash2, User, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AuthDialog } from "./AuthDialog";
import { AccountSettingsDialog } from "./AccountSettingsDialog";
import { useAuth } from "@/hooks/useAuth";
import { useExperiments } from "@/hooks/useExperiments";
import { formatDistanceToNow } from "date-fns";

interface SidebarProps {
  onExperimentSelect?: (experimentId: string) => void;
}

export const Sidebar = ({ onExperimentSelect }: SidebarProps) => {
  const { open, isMobile, setOpenMobile } = useSidebar();
  const { user, signOut } = useAuth();
  const { experiments, isLoading } = useExperiments();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<{ id: string; name: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const handleDelete = async () => {
    if (!selectedExperiment) return;

    // TODO: Implement delete experiment via GraphQL
    toast.success("Experiment deleted");
    setDeleteDialogOpen(false);
    setSelectedExperiment(null);
  };

  const handleRename = async () => {
    if (!selectedExperiment || !newName.trim()) return;

    // TODO: Implement rename experiment via GraphQL
    toast.success("Experiment renamed");
    setRenameDialogOpen(false);
    setSelectedExperiment(null);
    setNewName("");
  };

  return (
    <SidebarContainer className="border-r border-sidebar-border" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          {open && <h1 className="text-base font-bold text-foreground">Simulations</h1>}
          <SidebarTrigger className="hover:bg-sidebar-accent">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="p-4">
            <Button
              variant="ghost"
              className={`w-full text-sidebar-foreground hover:bg-sidebar-accent ${
                open ? "justify-start gap-2" : "justify-center"
              }`}
              size={open ? "default" : "icon"}
              onClick={() => window.location.reload()}
            >
              <Plus className="h-4 w-4" />
              {open && "New simulation"}
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup
            className={`transition-all duration-300 ease-in-out ${
              open ? "opacity-100 max-h-screen" : "opacity-0 max-h-0 overflow-hidden"
            }`}
          >
            <SidebarGroupLabel className="px-4 text-xs text-muted-foreground">Recent Experiments</SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              {isLoading ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
              ) : experiments.length === 0 ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">No experiments yet</div>
              ) : (
                <div className="space-y-1">
                  {experiments.slice(0, 10).map((experiment) => (
                    <div key={experiment.id} className="flex items-center gap-1 group">
                      <Button
                        variant="ghost"
                        className="flex-1 justify-start gap-2 h-auto py-2 px-3 text-left overflow-hidden"
                        onClick={() => {
                          onExperimentSelect?.(experiment.id);
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="text-xs truncate" title={experiment.title}>
                            {experiment.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(experiment.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedExperiment({ id: experiment.id, name: experiment.title });
                              setNewName(experiment.title);
                              setRenameDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedExperiment({ id: experiment.id, name: experiment.title });
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter
        className={`p-4 space-y-3 transition-all duration-300 ease-in-out ${
          open ? "opacity-100 max-h-screen" : "opacity-0 max-h-0 overflow-hidden"
        }`}
      >
        {user ? (
          <div className="space-y-3">
            {/* Account Menu */}
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-3 px-3 bg-sidebar-accent/50 hover:bg-sidebar-accent"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium truncate">{user.email?.split('@')[0] || 'User'}</span>
                </div>
                {isAccountMenuOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {isAccountMenuOpen && (
                <div className="space-y-1 border border-border rounded-md bg-card p-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-auto py-2 px-3 text-sm"
                    onClick={() => setAccountSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-auto py-2 px-3 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Create a Free Account</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Check className="h-3 w-3 mt-0.5 text-success" />
                <span>Save and access your simulation history</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-3 w-3 mt-0.5 text-success" />
                <span>Unlimited personas</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-3 w-3 mt-0.5 text-success" />
                <span>Export and share results</span>
              </div>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                setAuthMode("signup");
                setAuthDialogOpen(true);
              }}
            >
              Sign Up Free
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <button
                className="text-primary hover:underline"
                onClick={() => {
                  setAuthMode("signin");
                  setAuthDialogOpen(true);
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        )}
      </SidebarFooter>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} defaultMode={authMode} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete experiment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedExperiment?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename experiment</DialogTitle>
            <DialogDescription>Enter a new name for this experiment</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AccountSettingsDialog
        open={accountSettingsOpen}
        onOpenChange={setAccountSettingsOpen}
      />
    </SidebarContainer>
  );
};