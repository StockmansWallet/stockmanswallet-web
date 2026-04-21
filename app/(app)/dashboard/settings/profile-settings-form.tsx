"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, Phone, FileText } from "lucide-react";
import { updateProfileSettings } from "./actions";
import { roleDisplayName } from "@/lib/types/advisory";

interface ProfileSettingsFormProps {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  contactEmail: string;
  contactPhone: string;
  propertyName: string;
  companyName: string;
  bio: string;
  isAdvisor: boolean;
}

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-brand/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
      <Icon className="text-brand h-3.5 w-3.5" aria-hidden="true" />
    </div>
  );
}

/**
 * Single form containing every editable profile field. Replaces the three
 * per-section forms (Profile / Contact Details / Bio) which each had their
 * own save button. One Save button at the bottom writes them all at once.
 */
export function ProfileSettingsForm({
  email,
  firstName,
  lastName,
  role,
  contactEmail,
  contactPhone,
  propertyName,
  companyName,
  bio,
  isAdvisor,
}: ProfileSettingsFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateProfileSettings(formData);
    setSubmitting(false);

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    if (result?.success) {
      setMessage({ type: "success", text: result.success });
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-error/40 bg-error/10 text-error"
              : "border-success/40 bg-success/10 text-success"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={User} />
            <CardTitle>Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="first_name"
                name="first_name"
                label="First Name"
                defaultValue={firstName}
                placeholder="First name"
              />
              <Input
                id="last_name"
                name="last_name"
                label="Last Name"
                defaultValue={lastName}
                placeholder="Last name"
              />
            </div>
            <Input
              id="email"
              label="Email"
              value={email}
              disabled
              helperText="Email cannot be changed"
            />
            <Input
              id="role_display"
              label="Role"
              value={roleDisplayName(role) || "Producer"}
              disabled
              helperText="Role is set during onboarding and cannot be changed"
            />
            <input type="hidden" name="role" value={role || "producer"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={Phone} />
            <CardTitle>Contact Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-text-muted text-xs leading-relaxed">
              These details are visible when another producer views your profile in the Producer
              Network.
            </p>
            <Input
              id="contact_email"
              name="contact_email"
              label="Contact Email"
              type="email"
              defaultValue={contactEmail}
              placeholder="email@example.com"
            />
            <Input
              id="contact_phone"
              name="contact_phone"
              label="Contact Phone"
              defaultValue={contactPhone}
              placeholder="04XX XXX XXX"
            />
            {isAdvisor ? (
              <Input
                id="company_name"
                name="company_name"
                label="Company Name"
                defaultValue={companyName}
                placeholder="Company name"
              />
            ) : (
              <Input
                id="property_name"
                name="property_name"
                label="Farm / Property Name"
                defaultValue={propertyName}
                placeholder="Property name"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={FileText} />
            <CardTitle>Bio</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            id="bio"
            name="bio"
            label="About You"
            defaultValue={bio}
            placeholder="Tell other producers about your operation..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}
