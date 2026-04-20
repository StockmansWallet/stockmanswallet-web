# Advisory Connections & Producer Network Architecture

*Created: 11 March 2026*

## Overview

Two-way connection system allowing advisors to request access to producer portfolio data, and producers to connect with each other as peers. Both flows use the same `connection_requests` table with different `connection_type` values.

---

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `connection_requests` | All connections (advisory + producer_peer) |
| `user_profiles` | Directory listings, roles, display info |
| `notifications` | In-app notifications for connection events |
| `advisory_messages` | Thread-based notes/chat on connections |
| `herds` | Client portfolio data (advisor read-only access) |
| `properties` | Client property data (advisor read-only access) |

### connection_requests columns
`id, requester_user_id, target_user_id, requester_name, requester_role, requester_company, status, permission_granted_at, permission_expires_at, connection_type, created_at`

- `status`: pending | approved | denied | expired
- `connection_type`: advisory | producer_peer
- `permission_expires_at`: 3-day window for advisory, null for producer_peer

---

## Connection Flows

### Advisory (Advisor requests access to Producer data)

1. Advisor searches producers from `/dashboard/advisor/clients` page
2. `sendAdvisorConnectionRequest(targetUserId)` inserts pending row
3. Producer receives `new_connection_request` notification linking to `/dashboard/advisory-hub/my-advisors`
4. Producer approves: status=approved, permission_expires_at = now + 3 days
5. Advisor receives `request_approved` notification
6. Advisor views portfolio via `POST /api/advisor/client-herds` (service role, permission verified)
7. On expiry, advisor calls `requestRenewal()` to restart flow

### Producer Peer (Producer connects with Producer)

1. Producer searches directory at `/dashboard/producer-network/directory`
2. `sendProducerConnectionRequest(targetUserId)` inserts pending row
3. Recipient receives `producer_connection_request` notification
4. Recipient approves: status=approved (no expiry, permanent until denied)
5. Both can chat via `advisory_messages` table

---

## Route Structure

### Producer View

| Route | Purpose |
|-------|---------|
| `/dashboard/advisory-hub` | Hub landing (My Advisors + Find Advisors) |
| `/dashboard/advisory-hub/my-advisors` | Connected advisors list |
| `/dashboard/advisory-hub/my-advisors/[id]` | Single advisor notes thread |
| `/dashboard/advisory-hub/directory` | Browse listed advisors |
| `/dashboard/producer-network` | Hub landing (Connections + Find Producers) |
| `/dashboard/producer-network/directory` | Browse producers by state/search |
| `/dashboard/producer-network/connections` | Pending + approved peer connections |
| `/dashboard/producer-network/connections/[id]` | Peer chat thread |

### Advisor View

| Route | Purpose |
|-------|---------|
| `/dashboard/advisor/clients` | Client list with search for new producers |
| `/dashboard/advisor/clients/[id]` | Client detail (portfolio view + notes) |
| `/dashboard/advisor/directory` | Producer directory (standalone) |

### Shared

| Route | Purpose |
|-------|---------|
| `/dashboard/notifications` | All notifications, grouped by date |
| `POST /api/advisor/client-herds` | Service-role endpoint for advisor portfolio access |

---

## Role-Based Navigation

`useViewMode` hook (client-side, localStorage persisted as `sw-view-mode`):
- Values: `"producer"` | `"advisor"`
- Default: `"producer"`

**Producer sidebar:** Dashboard, Herds, Properties, Brangus, Markets, Yard Book, Reports, Freight IQ, Grid IQ, Advisory Hub, Producer Network

**Advisor sidebar:** Dashboard, Clients, Markets, Brangus, Reports, Freight IQ

Navigation config lives in `lib/navigation/nav-config.tsx`. View mode toggle in sidebar header.

---

## Notification Types

| Type | Recipient | Link |
|------|-----------|------|
| `new_connection_request` | Producer | `/dashboard/advisory-hub/my-advisors` |
| `request_approved` | Advisor | `/dashboard/advisor/clients/{id}` |
| `request_denied` | Advisor | - |
| `renewal_requested` | Producer | `/dashboard/advisory-hub/my-advisors` |
| `new_message` | Either party | connection detail page |
| `producer_connection_request` | Producer | `/dashboard/producer-network/connections` |
| `producer_request_approved` | Producer | `/dashboard/producer-network/connections/{id}` |

Created via `createNotification()` RPC. Displayed at `/dashboard/notifications` (last 50, grouped by date). Mark read/unread via server actions.

---

## Permission Model

**Advisory access:**
- 3-day time-boxed window per approval
- Verified server-side in `/api/advisor/client-herds` before serving data
- Uses Supabase service role to bypass RLS after permission check
- Read-only (advisor cannot modify producer data)

**Producer peer:**
- No time limit, permanent until denied
- Both parties can message

**Directory visibility:**
- Advisors: must set `is_listed_in_directory=true` in profile
- Producers: always visible in producer network directory
- All directory search inputs sanitised (alphanumeric, spaces, hyphens, apostrophes only)

**RLS:**
- `connection_requests`: users can read rows where they are requester or target
- Advisors cannot directly query client herds (RLS blocks). Must use `/api/advisor/client-herds` service-role endpoint.
- `user_profiles`: readable by any authenticated user for directory lookups

---

## Key Types (lib/types/advisory.ts)

- `ConnectionRequest` - full connection row
- `DirectoryProducer` - user_id, display_name, company_name, role, state, region, bio
- `DirectoryAdvisor` - extends DirectoryProducer with contact_email, contact_phone, is_listed_in_directory
- `AdvisoryMessage` - id, connection_id, sender_user_id, message_type, content, created_at
- `AppNotification` - id, user_id, type, title, body, link, is_read, related_connection_id, created_at

**Helpers:**
- `hasActivePermission(connection)` - status=approved and permission_expires_at in future
- `permissionTimeRemaining(connection)` - human-readable countdown
- `isAdvisorRole(role)` - true if not farmer_grazier

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/types/advisory.ts` | All types, helpers, role config |
| `lib/advisory/notifications.ts` | Notification creation helpers |
| `lib/advisory/permission-check.ts` | Permission verification |
| `lib/navigation/nav-config.tsx` | Role-based sidebar nav config |
| `lib/hooks/use-view-mode.tsx` | View mode context + hook |
| `components/app/advisory/` | Shared advisory UI components |
| `components/app/producer-network/` | Producer network UI components |
| `components/app/view-mode-toggle.tsx` | Sidebar view mode switcher |
| `components/app/notification-bell.tsx` | Header notification icon |
| `app/api/advisor/client-herds/route.ts` | Service-role portfolio endpoint |
