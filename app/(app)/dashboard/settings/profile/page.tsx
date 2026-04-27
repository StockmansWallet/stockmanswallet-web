import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft, Eye, Home, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { ProfileSettingsForm } from "../profile-settings-form";
import { VisibilityForm } from "../visibility-form";
import { ProfileAvatar } from "../profile-avatar";
import { isAdvisorRole } from "@/lib/types/advisory";
import { enrichProducers } from "@/lib/data/producer-enrichment";
import type { HerdSizeBucket, PrimarySpecies } from "@/lib/data/producer-enrichment";

export const revalidate = 0;

export const metadata = { title: "Profile - Settings" };

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "role, contact_email, contact_phone, bio, is_discoverable_to_producers, is_listed_in_directory, company_name, property_name, state, region"
    )
    .eq("user_id", user!.id)
    .single();

  const isAdvisor = profile?.role ? isAdvisorRole(profile.role) : false;

  // Derived snapshot fields: pulled from herds + properties so the
  // producer can see what the public directory profile surfaces about
  // them. Advisors don't get this card - it's producer-only content.
  const enrichmentMap = isAdvisor ? null : await enrichProducers(supabase, [user!.id]);
  const enrichment = enrichmentMap?.get(user!.id);

  return (
    <div>
      <div className="mb-4 sm:hidden">
        <Link
          href="/dashboard/settings"
          className="bg-surface-lowest text-text-secondary hover:bg-surface-raised hover:text-text-primary inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
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

      <div className="grid w-full max-w-[1400px] grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <PublicProfilePreview
            avatarUrl={user?.user_metadata?.avatar_url ?? ""}
            firstName={user?.user_metadata?.first_name ?? ""}
            lastName={user?.user_metadata?.last_name ?? ""}
            email={user?.email ?? ""}
            contactEmail={profile?.contact_email ?? ""}
            contactPhone={profile?.contact_phone ?? ""}
            propertyName={profile?.property_name ?? ""}
            companyName={profile?.company_name ?? ""}
            bio={profile?.bio ?? ""}
            state={profile?.state ?? null}
            region={profile?.region ?? null}
            primarySpecies={enrichment?.primary_species ?? null}
            herdSizeBucket={enrichment?.herd_size_bucket ?? null}
            propertyCount={enrichment?.property_count ?? 0}
            isAdvisor={isAdvisor}
            isVisible={
              isAdvisor
                ? profile?.is_listed_in_directory ?? false
                : profile?.is_discoverable_to_producers ?? false
            }
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
                isDiscoverableToProducers={profile?.is_discoverable_to_producers ?? false}
                isListedInDirectory={profile?.is_listed_in_directory ?? false}
              />
            </CardContent>
          </Card>
        </aside>

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
      </div>
    </div>
  );
}

const HERD_SIZE_LABEL: Record<string, string> = {
  small: "Small herd",
  medium: "Medium herd",
  large: "Large herd",
};

function PublicProfilePreview({
  avatarUrl,
  firstName,
  lastName,
  email,
  contactEmail,
  contactPhone,
  propertyName,
  companyName,
  bio,
  state,
  region,
  primarySpecies,
  herdSizeBucket,
  propertyCount,
  isAdvisor,
  isVisible,
}: {
  avatarUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  contactEmail: string;
  contactPhone: string;
  propertyName: string;
  companyName: string;
  bio: string;
  state: string | null;
  region: string | null;
  primarySpecies: PrimarySpecies | null;
  herdSizeBucket: HerdSizeBucket | null;
  propertyCount: number;
  isAdvisor: boolean;
  isVisible: boolean;
}) {
  const publicName = firstName && lastName ? `${firstName} ${lastName}` : email;
  const publicOrg = isAdvisor ? companyName : propertyName;
  const location = [region, state].filter(Boolean).join(", ");

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-white/[0.06] bg-white/[0.03] px-5 py-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Public Preview
        </p>
        <ProfileAvatar
          avatarUrl={avatarUrl}
          firstName={firstName}
          lastName={lastName}
          email={contactEmail || email}
        />
        <div className="mt-5 space-y-2">
          {!firstName && !lastName && <h2 className="text-xl font-semibold text-text-primary">{publicName}</h2>}
          {publicOrg && <p className="text-sm text-text-secondary">{publicOrg}</p>}
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-text-secondary">
          <ShieldCheck
            className={`h-3.5 w-3.5 ${isVisible ? "text-success" : "text-text-muted"}`}
            aria-hidden="true"
          />
          {isVisible ? "Visible in network" : "Hidden from search"}
        </div>
      </div>

      <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          {location && <PreviewLine icon={<MapPin />} label={location} />}
          {!isAdvisor && propertyCount > 0 && (
            <PreviewLine
              icon={<Home />}
              label={propertyCount === 1 ? "1 property" : `${propertyCount} properties`}
            />
          )}
          {!isAdvisor && primarySpecies && (
            <PreviewLine
              icon={<Home />}
              label={[primarySpecies, herdSizeBucket ? HERD_SIZE_LABEL[herdSizeBucket] : null]
                .filter(Boolean)
                .join(" · ")}
            />
          )}
          {contactEmail && <PreviewLine icon={<Mail />} label={contactEmail} />}
          {contactPhone && <PreviewLine icon={<Phone />} label={contactPhone} />}
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">About</p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {bio || "Add a short bio so other producers can understand your operation."}
          </p>
        </div>

        {!isAdvisor && (
          <p className="border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-text-muted">
            Herd, property and location details are derived from your app data where available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewLine({ icon, label }: { icon: React.ReactElement; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-text-secondary">
      <span className="text-text-muted [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
