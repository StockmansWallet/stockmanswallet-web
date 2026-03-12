import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, Phone, FileText, Eye, Lock, Trash2 } from "lucide-react";
import { ProfileForm } from "../profile-form";
import { ContactDetailsForm } from "../contact-details-form";
import { BioForm } from "../bio-form";
import { VisibilityForm } from "../visibility-form";
import { PasswordForm } from "../password-form";
import { DeleteAccountButton } from "../delete-account-button";
import { isAdvisorRole } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = { title: "Account - Settings" };

function SectionIcon({ icon: Icon, variant }: { icon: React.ComponentType<{ className?: string }>; variant?: "danger" }) {
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
      variant === "danger" ? "bg-red-500/15" : "bg-brand/15"
    }`}>
      <Icon className={`h-3.5 w-3.5 ${variant === "danger" ? "text-red-400" : "text-brand"}`} />
    </div>
  );
}

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, contact_email, contact_phone, bio, is_discoverable, is_discoverable_to_farmers, is_listed_in_directory, company_name, property_name, state, region")
    .eq("user_id", user!.id)
    .single();

  const isAdvisor = profile?.role ? isAdvisorRole(profile.role) : false;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Account"
        subtitle="Manage your profile, visibility, and security."
        actions={
          <Link
            href="/dashboard/settings"
            className="inline-flex h-8 items-center justify-center rounded-xl px-3.5 text-[13px] font-semibold text-text-secondary transition-all duration-150 hover:bg-white/8 hover:text-text-primary"
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left column - Profile info */}
        <div className="flex-1 space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={User} />
                <CardTitle>Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ProfileForm
                email={user?.email ?? ""}
                firstName={user?.user_metadata?.first_name ?? ""}
                lastName={user?.user_metadata?.last_name ?? ""}
                role={profile?.role ?? ""}
              />
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Phone} />
                <CardTitle>Contact Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ContactDetailsForm
                contactEmail={profile?.contact_email ?? ""}
                contactPhone={profile?.contact_phone ?? ""}
                companyName={isAdvisor ? (profile?.company_name ?? "") : ""}
                propertyName={!isAdvisor ? (profile?.property_name ?? "") : ""}
                isAdvisor={isAdvisor}
              />
            </CardContent>
          </Card>

          {/* Bio */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={FileText} />
                <CardTitle>Bio</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <BioForm
                bio={profile?.bio ?? ""}
                isAdvisor={isAdvisor}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Settings */}
        <div className="w-full space-y-6 lg:w-[380px]">
          {/* Visibility */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Eye} />
                <CardTitle>{isAdvisor ? "Directory Visibility" : "Discoverability"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <VisibilityForm
                isAdvisor={isAdvisor}
                isDiscoverable={profile?.is_discoverable ?? false}
                isDiscoverableToFarmers={profile?.is_discoverable_to_farmers ?? false}
                isListedInDirectory={profile?.is_listed_in_directory ?? false}
              />
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Lock} />
                <CardTitle>Password</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>

          {/* Delete Account */}
          <Card className="ring-1 ring-inset ring-red-500/20">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Trash2} variant="danger" />
                <CardTitle className="text-red-400">Delete Account</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-text-muted leading-relaxed">
                Permanently delete your account and all associated data including herds,
                properties, records, and settings. This affects both the web app and iOS app.
              </p>
              <DeleteAccountButton />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
