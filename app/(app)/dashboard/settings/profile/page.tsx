import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft, User, Phone, FileText, Eye } from "lucide-react";
import { ProfileForm } from "../profile-form";
import { ContactDetailsForm } from "../contact-details-form";
import { BioForm } from "../bio-form";
import { VisibilityForm } from "../visibility-form";
import { isAdvisorRole } from "@/lib/types/advisory";
import { ProfileAvatar } from "../profile-avatar";

export const revalidate = 0;

export const metadata = { title: "Profile - Settings" };

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Icon className="h-3.5 w-3.5 text-brand" />
    </div>
  );
}

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, contact_email, contact_phone, bio, is_discoverable, is_discoverable_to_farmers, is_listed_in_directory, company_name, property_name, state, region")
    .eq("user_id", user!.id)
    .single();

  const isAdvisor = profile?.role ? isAdvisorRole(profile.role) : false;

  return (
    <div className="max-w-3xl">
      <div className="mb-4 sm:hidden">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-lowest px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
      </div>
      <PageHeader
        title="Profile"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Your personal information, contact details, and visibility settings."
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left column - Profile info */}
        <div className="flex-1 space-y-6">
          {/* Avatar */}
          <ProfileAvatar
            avatarUrl={user?.user_metadata?.avatar_url ?? ""}
            firstName={user?.user_metadata?.first_name ?? ""}
            lastName={user?.user_metadata?.last_name ?? ""}
            email={user?.email ?? ""}
          />

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

        {/* Right column - Visibility */}
        <div className="w-full space-y-6 lg:w-[380px]">
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
        </div>
      </div>
    </div>
  );
}
