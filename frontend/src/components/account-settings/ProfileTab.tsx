import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AvatarUpload } from "./AvatarUpload";
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
});

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type EmailFormData = z.infer<typeof emailSchema>;

export const ProfileTab = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: user?.email || "",
    },
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      emailForm.setValue("email", user.email || "");
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    setProfile(data);
    
    // Parse full_name into first and last name
    const names = data.full_name?.split(" ") || ["", ""];
    profileForm.setValue("firstName", names[0] || "");
    profileForm.setValue("lastName", names.slice(1).join(" ") || "");
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!user) return;

    setIsLoadingProfile(true);
    const fullName = `${data.firstName} ${data.lastName}`.trim();

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    setIsLoadingProfile(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      loadProfile();
    }
  };

  const onSubmitEmail = async (data: EmailFormData) => {
    if (!user) return;

    setIsLoadingEmail(true);

    const { error } = await supabase.auth.updateUser({
      email: data.email,
    });

    setIsLoadingEmail(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Confirmation emails sent",
        description: "Check both your current and new email addresses to complete the change.",
      });
      setIsEditingEmail(false);
    }
  };

  const provider = user?.app_metadata?.provider || "email";
  const isGoogleAuth = provider === "google";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Profile</h3>
        <p className="text-sm text-muted-foreground">Manage your profile information</p>
      </div>

      <Separator />

      {/* Avatar Section */}
      <div>
        <Label className="text-sm font-medium">Profile Picture</Label>
        <AvatarUpload profile={profile} onUpdate={loadProfile} />
      </div>

      <Separator />

      {/* Name Section */}
      <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              {...profileForm.register("firstName")}
              className="mt-1.5"
            />
            {profileForm.formState.errors.firstName && (
              <p className="text-sm text-destructive mt-1">
                {profileForm.formState.errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              {...profileForm.register("lastName")}
              className="mt-1.5"
            />
            {profileForm.formState.errors.lastName && (
              <p className="text-sm text-destructive mt-1">
                {profileForm.formState.errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadProfile()}
            className="w-20"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoadingProfile} className="w-20">
            {isLoadingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </form>

      <Separator />

      {/* Email Section */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Email address</Label>
        
        {!isEditingEmail ? (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-sm text-muted-foreground">Primary email</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingEmail(true)}
              >
                Change email
              </Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4">
            <div>
              <Input
                {...emailForm.register("email")}
                placeholder="New email address"
              />
              {emailForm.formState.errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                You'll receive a confirmation email at your new address
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditingEmail(false);
                  emailForm.setValue("email", user?.email || "");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoadingEmail}>
                {isLoadingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Email
              </Button>
            </div>
          </form>
        )}
      </div>

      <Separator />

      {/* Connected Accounts Section */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Connected accounts</Label>
        
        {isGoogleAuth ? (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Google</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                Connected
              </span>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">No connected accounts</p>
          </Card>
        )}
      </div>
    </div>
  );
};
