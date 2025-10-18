import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProfileTab } from "./account-settings/ProfileTab";
import { SecurityTab } from "./account-settings/SecurityTab";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react";

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountSettingsDialog = ({
  open,
  onOpenChange,
}: AccountSettingsDialogProps) => {
  const [activeTab, setActiveTab] = useState("profile");
  const isMobile = useIsMobile();

  // --- Mobile layout ---
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Menu className="h-5 w-5" />
              <SheetTitle className="text-xl">Account</SheetTitle>
            </div>
          </SheetHeader>

          <ScrollArea className="h-full pb-20">
            <div className="px-6 py-6 space-y-8">
              <ProfileTab />
              <SecurityTab />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // --- Desktop layout ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Account Settings</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex h-[80vh] overflow-hidden"
        >
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0 border-r border-border bg-muted/30 p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 px-3">Settings</h2>
            <TabsList className="flex flex-col h-auto bg-transparent space-y-1 w-full">
              <TabsTrigger
                value="profile"
                className="w-full justify-start px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="w-full justify-start px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Security
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Main content (scrollable) */}
          <div className="flex-1 overflow-hidden">
            <TabsContent
              value="profile"
              className="h-full overflow-y-auto p-6"
            >
              <ProfileTab />
            </TabsContent>
            <TabsContent
              value="security"
              className="h-full overflow-y-auto p-6"
            >
              <SecurityTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
