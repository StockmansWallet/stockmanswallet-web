import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft, Eye } from "lucide-react";
import { ProfileSettingsForm } from "../profile-settings-form";
import { VisibilityForm } from "../visibility-form";
import { ProducerSnapshotCard } from "../producer-snapshot-card";
import { ProfileAvatar } from "../profile-avatar";
import { isAdvisorRole } from "@/lib/types/advisory";
import { enrichProducers } from "@/lib/data/producer-enrichment";

export const revalidate = 0;

export const metadata = { title: "Profile - Settings" };

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, contact_email, contact_phone, bio, is_discoverable_to_farmers, is_listed_in_directory, company_name, property_name, state, region")
    .eq("user_id", user!.id)
    .single();

  const isAdvisor = profile?.role ? isAdvisorRole(profile.role) : false;

  // Derived snapshot fields: pulled from herds + properties so the
  // producer can see what the public directory profile surfaces about
  // them. Advisors don't get this card - it's producer-only content.
  const enrichmentMap = isAdvisor ? null : await enrichProducers(supabase, [user!.id]);
  const enrichment = enrichmentMap?.get(user!.id);

  return (
    <div className="max-w-3xl">
      <div className="mb-4 sm:hidden">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Settings
        </Link>
      </div>

      <PageHeader
        title="Profile"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Your personal information, contact details, and visibility."
      />

      <div className="space-y-6">
        <ProfileAvatar
          avatarUrl={user?.user_metadata?.avatar_url ?? ""}
          firstName={user?.user_metadata?.first_name ?? ""}
          lastName={user?.user_metadata?.last_name ?? ""}
          email={user?.email ?? ""}
        />

        {!isAdvisor && enrichment && (
          <ProducerSnapshotCard
            state={profile?.state ?? null}
            region={profile?.region ?? null}
            primary_species={enrichment.primary_species}
            herd_size_bucket={enrichment.herd_size_bucket}
            property_count={enrichment.property_count}
          />
        )}

        <ProfileSettingsForm
          email={user?.email ?? ""}
          firstName={user?.user_metadata?.first_name ?? ""}
          lastName={user?.user_metadata?.last_name ?? ""}
          role={profile?.role ?? ""}
          contactEmail={profile?.contact_email ?? ""}
          contactPhone={profile?.contact_phone ?? ""}
          propertyName={profile?.property_name ?? ""}
          companyName={profile?.company_name ?? ""}
          bio={profile?.bio ?? ""}
          isAdvisor={isAdvisor}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                <Eye className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              </div>
              <CardTitle>{isAdvisor ? "Directory Visibility" : "Discoverability"}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <VisibilityForm
              isAdvisor={isAdvisor}
              isDiscoverableToFarmers={profile?.is_discoverable_to_farmers ?? false}
              isListedInDirectory={profile?.is_listed_in_directory ?? false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
