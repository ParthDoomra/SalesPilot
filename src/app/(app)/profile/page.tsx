"use client";

import * as React from "react";
import { User as UserIcon, Mail, Shield, Building, Upload, Trash2, CheckCircle2, Loader2, Camera } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();

  const [fullName, setFullName] = React.useState("");
  const [photoURL, setPhotoURL] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state when user profile is loaded or updated
  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.displayName || user.name || "");
      setPhotoURL(user.photoURL ?? null);
    }
  }, [user]);

  const initials = fullName
    ? fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select a valid image file (JPEG, PNG, WebP)." });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image file size must be less than 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPhotoURL(base64);
      setMessage(null);
    };
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    setPhotoURL(null);
    setMessage(null);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setMessage({ type: "error", text: "Full Name cannot be empty." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await updateUserProfile({
        fullName: fullName.trim(),
        photoURL,
      });

      if (res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: "Profile updated successfully!" });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: errorMsg || "Failed to save profile." });
    } finally {
      setIsSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="User Profile"
        description="View and manage your account details and profile information."
      />

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-success/30 bg-success-soft text-success"
              : "border-danger/30 bg-danger-soft text-danger"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <UserIcon className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Card Header */}
        <Card className="p-6">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-border-default shadow-md">
                {photoURL ? <AvatarImage src={photoURL} alt={fullName} /> : null}
                <AvatarFallback
                  style={{ backgroundColor: user.avatarColor }}
                  className="text-2xl font-semibold text-white"
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                title="Change photo"
              >
                <Camera className="h-6 w-6 text-white" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-foreground">
                {fullName || user.name}
              </h2>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="rounded-full bg-signal-soft px-2.5 py-0.5 text-xs font-medium text-signal">
                  {user.role}
                </span>
                <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs text-muted-foreground">
                  {user.orgName}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Profile Details Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your full name and display picture. Your email is managed by your account provider.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Avatar upload / remove controls */}
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="avatar-upload-btn"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-default bg-surface px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-signal/50"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload New Photo
                </label>
                <input
                  id="avatar-upload-btn"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                {photoURL && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-danger hover:bg-danger-soft hover:text-danger"
                    onClick={handleRemovePhoto}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Supports JPG, PNG, or WebP up to 2MB.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Read-only)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={user.email}
                    readOnly
                    disabled
                    className="cursor-not-allowed bg-surface-raised pl-9 opacity-80"
                  />
                </div>
              </div>
            </div>

            {/* Account Metadata */}
            <div className="grid grid-cols-1 gap-6 border-t border-border-subtle pt-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={user.role}
                    readOnly
                    disabled
                    className="cursor-not-allowed bg-surface-raised pl-9 opacity-80"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Organization</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={user.orgName}
                    readOnly
                    disabled
                    className="cursor-not-allowed bg-surface-raised pl-9 opacity-80"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving} className="min-w-32">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
