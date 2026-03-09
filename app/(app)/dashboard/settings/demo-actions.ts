"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Date helpers
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function daysFromNow(n: number): string {
  return daysAgo(-n);
}
function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

export async function seedDemoData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Soft-delete any existing demo data - real user data is untouched
  const now = new Date().toISOString();
  const del = { is_deleted: true, deleted_at: now, updated_at: now };
  await Promise.all([
    supabase.from("yard_book_items").update(del).eq("user_id", user.id).eq("is_demo_data", true),
    supabase.from("muster_records").update(del).eq("user_id", user.id).eq("is_demo_data", true),
    supabase.from("health_records").update(del).eq("user_id", user.id).eq("is_demo_data", true),
    supabase.from("sales_records").update(del).eq("user_id", user.id).eq("is_demo_data", true),
    supabase.from("herd_groups").update(del).eq("user_id", user.id).eq("is_demo_data", true),
    supabase.from("properties").update({ ...del }).eq("user_id", user.id).eq("is_simulated", true),
  ]);

  const uid = user.id;
  const pid = randomUUID();

  // Insert Doongara Station (flagged as demo/simulated)
  const { error: propError } = await supabase
    .from("properties")
    .insert({
      id: pid,
      user_id: uid,
      is_simulated: true,
      property_name: "Doongara Station",
      property_pic: "QDAB1234",
      state: "QLD",
      region: "Central Queensland",
      suburb: "Emerald",
      postcode: "4720",
      address: "1742 Capricorn Highway",
      latitude: -23.437,
      longitude: 148.158,
      acreage: 15000,
      property_type: "Grazing",
      notes: "Demo property - Doongara Station, Central Queensland",
    });

  if (propError) return { error: propError.message };

  // Pre-generate herd UUIDs so child records can reference them
  const herdIds = Array.from({ length: 20 }, () => randomUUID());

  const defaultSaleyard = "Gracemere Central Queensland Livestock Exchange";
  const base = (idx: number) => ({
    id: herdIds[idx],
    user_id: uid, property_id: pid, is_demo_data: true,
    is_breeder: false, is_pregnant: false, is_sold: false, calving_rate: 0.85,
    selected_saleyard: defaultSaleyard,
  });

  // All 20 herds flagged with is_demo_data: true
  const { error: herdsError } = await supabase.from("herd_groups").insert([
    // COWS
    {
      ...base(0), name: "Main Breeders", species: "Cattle", breed: "Droughtmaster",
      sex: "Female", category: "Breeder Cow",
      age_months: 48, head_count: 185, initial_weight: 540, current_weight: 540,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: true,
      calving_rate: 88, breeding_program_type: "ai",
      paddock_name: "Home Paddock",
      notes: "AI program, Doongara Dozer sire line",
    },
    {
      ...base(1), name: "First-Calf Heifers", species: "Cattle", breed: "Brangus",
      sex: "Female", category: "Breeder Heifer",
      age_months: 26, head_count: 45, initial_weight: 380, current_weight: 420,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: true,
      calving_rate: 82, breeding_program_type: "controlled",
      paddock_name: "River Paddock",
      notes: "First calvers, controlled joining",
    },
    {
      ...base(2), name: "Wet Cows", species: "Cattle", breed: "Droughtmaster",
      sex: "Female", category: "Wet Cow",
      age_months: 54, head_count: 60, initial_weight: 510, current_weight: 510,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: false,
      calving_rate: 90, lactation_status: "Lactating",
      paddock_name: "Creek Paddock",
      notes: "Calves at foot, good condition",
    },
    {
      ...base(3), name: "Cull Cows", species: "Cattle", breed: "Mixed Breed",
      sex: "Female", category: "Cull Cow",
      age_months: 84, head_count: 22, initial_weight: 480, current_weight: 480,
      daily_weight_gain: 0, is_sold: true,
      paddock_name: "Back Paddock",
      notes: "Drafted for Gracemere sale",
    },
    // HEIFERS
    {
      ...base(4), name: "Weaner Heifers", species: "Cattle", breed: "Droughtmaster",
      sex: "Female", category: "Weaner Heifer",
      age_months: 7, head_count: 65, initial_weight: 160, current_weight: 220,
      daily_weight_gain: 0.85,
      paddock_name: "East Paddock",
      notes: "Off mothers, supplementary feed",
    },
    {
      ...base(5), name: "Yearling Heifers", species: "Cattle", breed: "Brangus",
      sex: "Female", category: "Yearling Heifer",
      age_months: 14, head_count: 50, initial_weight: 200, current_weight: 310,
      daily_weight_gain: 0.75,
      paddock_name: "North Paddock",
      notes: "Growing well on improved pasture",
    },
    {
      ...base(6), name: "Feeder Heifers", species: "Cattle", breed: "Charolais",
      sex: "Female", category: "Feeder Heifer",
      age_months: 18, head_count: 35, initial_weight: 250, current_weight: 380,
      daily_weight_gain: 0.65,
      paddock_name: "South Paddock",
    },
    {
      ...base(7), name: "Grown Heifers (Un-Joined)", species: "Cattle", breed: "Angus",
      sex: "Female", category: "Grown Heifer (Un-Joined)",
      age_months: 24, head_count: 28, initial_weight: 380, current_weight: 440,
      daily_weight_gain: 0.3,
      paddock_name: "West Paddock",
      notes: "Ready to join next season",
    },
    // BULLS
    {
      ...base(8), name: "Weaner Bulls", species: "Cattle", breed: "Brahman",
      sex: "Male", category: "Weaner Bull",
      age_months: 7, head_count: 30, initial_weight: 170, current_weight: 240,
      daily_weight_gain: 1.0,
      paddock_name: "Rocky Paddock",
      notes: "Recently weaned, monitoring growth",
    },
    {
      ...base(9), name: "Yearling Bulls", species: "Cattle", breed: "Droughtmaster",
      sex: "Male", category: "Yearling Bull",
      age_months: 15, head_count: 18, initial_weight: 230, current_weight: 360,
      daily_weight_gain: 0.9,
      paddock_name: "Bore Paddock",
      notes: "Bull selection draft pending",
    },
    {
      ...base(10), name: "Herd Bulls", species: "Cattle", breed: "Brahman",
      sex: "Male", category: "Grown Bull",
      age_months: 48, head_count: 8, initial_weight: 850, current_weight: 850,
      daily_weight_gain: 0,
      paddock_name: "Home Paddock",
      notes: "Working bulls, annual BBSE completed",
    },
    {
      ...base(11), name: "Cull Bulls", species: "Cattle", breed: "Mixed Breed",
      sex: "Male", category: "Cull Bull",
      age_months: 72, head_count: 5, initial_weight: 780, current_weight: 780,
      daily_weight_gain: 0, is_sold: true,
      paddock_name: "Back Paddock",
      notes: "Past working age",
    },
    // STEERS
    {
      ...base(12), name: "Weaner Steers", species: "Cattle", breed: "Droughtmaster",
      sex: "Male", category: "Weaner Steer",
      age_months: 7, head_count: 70, initial_weight: 160, current_weight: 230,
      daily_weight_gain: 1.1,
      paddock_name: "East Paddock",
      notes: "Fresh off mothers, strong weaners",
    },
    {
      ...base(13), name: "Yearling Steers", species: "Cattle", breed: "Brangus",
      sex: "Male", category: "Yearling Steer",
      age_months: 14, head_count: 55, initial_weight: 210, current_weight: 340,
      daily_weight_gain: 0.85,
      paddock_name: "Top Paddock",
      notes: "Good growth rates",
    },
    {
      ...base(14), name: "Feeder Steers", species: "Cattle", breed: "Angus",
      sex: "Male", category: "Feeder Steer",
      age_months: 18, head_count: 40, initial_weight: 260, current_weight: 400,
      daily_weight_gain: 0.7,
      paddock_name: "Hill Paddock",
      notes: "Feedlot-ready condition",
    },
    {
      ...base(15), name: "Grown Steers", species: "Cattle", breed: "Charolais",
      sex: "Male", category: "Grown Steer",
      age_months: 26, head_count: 32, initial_weight: 340, current_weight: 520,
      daily_weight_gain: 0.5, is_sold: true,
      paddock_name: "South Paddock",
      notes: "Near turn-off weight",
    },
    // ADDITIONAL
    {
      ...base(16), name: "Premium Angus Weaners", species: "Cattle", breed: "Angus",
      sex: "Male", category: "Weaner Steer",
      age_months: 8, head_count: 45, initial_weight: 180, current_weight: 250,
      daily_weight_gain: 1.05,
      paddock_name: "North Paddock",
      notes: "Top draft weaners, purchased at Gracemere",
    },
    {
      ...base(17), name: "Hereford Breeders", species: "Cattle", breed: "Hereford",
      sex: "Female", category: "Breeder Cow",
      age_months: 42, head_count: 90, initial_weight: 560, current_weight: 560,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: true,
      calving_rate: 85, breeding_program_type: "uncontrolled",
      paddock_name: "River Paddock",
      notes: "Natural joining, River Paddock herd",
    },
    {
      ...base(18), name: "Droughtmaster Yearlings", species: "Cattle", breed: "Droughtmaster",
      sex: "Male", category: "Yearling Steer",
      age_months: 15, head_count: 60, initial_weight: 220, current_weight: 350,
      daily_weight_gain: 0.9,
      paddock_name: "West Paddock",
      notes: "Good weight gain on native pasture",
    },
    {
      ...base(19), name: "Brahman Feeder Heifers", species: "Cattle", breed: "Brahman",
      sex: "Female", category: "Feeder Heifer",
      age_months: 17, head_count: 25, initial_weight: 240, current_weight: 370,
      daily_weight_gain: 0.6, is_sold: true,
      paddock_name: "Bore Paddock",
      notes: "Tropically adapted, low maintenance",
    },
  ]);

  if (herdsError) return { error: herdsError.message };

  // Yard book items (18 events across 5 categories, matching iOS)
  const yb = () => ({ id: randomUUID(), user_id: uid, property_id: pid, is_demo_data: true, is_all_day: true, is_completed: false, is_recurring: false, notifications_scheduled: false });
  await supabase.from("yard_book_items").insert([
    // LIVESTOCK (4)
    { ...yb(), title: "Muster North Paddock", event_date: daysAgo(14), category_raw: "Livestock", is_completed: true, completed_date: daysAgo(14), notes: "Full muster, all head accounted for. Yearling heifers in good condition.", linked_herd_ids: [herdIds[0], herdIds[1], herdIds[4]] },
    { ...yb(), title: "Transport weaners to Gracemere", event_date: daysFromNow(7), category_raw: "Livestock", notes: "B-double booked with CQ Transport. 45 head Angus weaners.", linked_herd_ids: [herdIds[12], herdIds[4]], reminder_offsets: [7, 1] },
    { ...yb(), title: "Cull cows to CQLX sale", event_date: daysFromNow(21), category_raw: "Livestock", notes: "22 head cull cows. Check CQLX sale calendar for dates.", reminder_offsets: [7, 3] },
    { ...yb(), title: "Pregnancy testing - Main Breeders", event_date: daysAgo(5), category_raw: "Livestock", is_completed: true, completed_date: daysAgo(5), notes: "Vet confirmed 88% conception rate. 12 empties drafted.", linked_herd_ids: [herdIds[0], herdIds[1]] },
    // OPERATIONS (4)
    { ...yb(), title: "Annual vaccination - 5-in-1", event_date: daysAgo(30), category_raw: "Operations", is_completed: true, completed_date: daysAgo(30), is_recurring: true, recurrence_rule_raw: "Annual", notes: "5-in-1 Ultravac for all breeders and weaners. Completed by vet.", linked_herd_ids: [herdIds[0]] },
    { ...yb(), title: "Drenching - Weaner Steers", event_date: daysAgo(12), category_raw: "Operations", is_completed: true, completed_date: daysAgo(12), notes: "Ivomec Plus drench, 10ml per 50kg body weight.", linked_herd_ids: [herdIds[12]] },
    { ...yb(), title: "Crush and yard maintenance", event_date: daysFromNow(14), category_raw: "Operations", notes: "Replace crush head bail latch. Check yard rails East Yards." },
    { ...yb(), title: "Water infrastructure check", event_date: daysFromNow(5), category_raw: "Operations", is_recurring: true, recurrence_rule_raw: "Monthly", notes: "Check bore pump, all troughs, and turkey nest dam levels.", reminder_offsets: [1] },
    // FINANCE (3)
    { ...yb(), title: "BAS lodgement", event_date: daysFromNow(30), category_raw: "Finance", is_recurring: true, recurrence_rule_raw: "Monthly", notes: "Quarterly BAS due. Send invoices to accountant.", reminder_offsets: [14, 7] },
    { ...yb(), title: "Livestock insurance renewal", event_date: daysFromNow(60), category_raw: "Finance", is_recurring: true, recurrence_rule_raw: "Annual", notes: "Review policy with broker. Update herd values.", reminder_offsets: [30, 7] },
    { ...yb(), title: "Accountant meeting - quarterly review", event_date: daysFromNow(35), category_raw: "Finance", is_all_day: false, event_time: "10:00", notes: "Quarterly review with accountant. Bring sale receipts and freight invoices." },
    // FAMILY (3)
    { ...yb(), title: "School holidays start", event_date: daysFromNow(25), category_raw: "Family", notes: "Kids home for 2 weeks. Plan station activities." },
    { ...yb(), title: "Wedding anniversary", event_date: daysAgo(8), category_raw: "Family", is_completed: true, completed_date: daysAgo(8), notes: "Dinner in Emerald." },
    { ...yb(), title: "Pony Club rally day", event_date: daysFromNow(3), category_raw: "Family", notes: "Emerald Pony Club. Drop kids 8am, pick up 3pm.", reminder_offsets: [1] },
    // ME (4)
    { ...yb(), title: "GP appointment", event_date: daysFromNow(10), category_raw: "Me", is_all_day: false, event_time: "14:30", notes: "Annual check-up. Dr Wilson, Emerald Medical Centre.", reminder_offsets: [1] },
    { ...yb(), title: "Rotary meeting", event_date: daysFromNow(18), category_raw: "Me", is_all_day: false, event_time: "18:00", is_recurring: true, recurrence_rule_raw: "Monthly", notes: "Emerald Rotary Club monthly dinner." },
    { ...yb(), title: "Fishing trip - Fairbairn Dam", event_date: daysFromNow(28), category_raw: "Me", notes: "Weekend trip with mates. Barramundi season." },
    { ...yb(), title: "Ag-Grow field day", event_date: daysFromNow(42), category_raw: "Me", notes: "Annual Emerald Ag-Grow. Check new fencing equipment.", reminder_offsets: [7, 1] },
  ]);

  // Health records (10 records, matching iOS)
  const hr = (herdIdx: number) => ({ id: randomUUID(), user_id: uid, herd_group_id: herdIds[herdIdx], is_demo_data: true });
  await supabase.from("health_records").insert([
    { ...hr(0), date: daysAgo(60), treatment_type_raw: "Vaccination", notes: "5-in-1 Ultravac, 2ml subcutaneous. All 185 head processed through Home Yards." },
    { ...hr(12), date: daysAgo(42), treatment_type_raw: "Vaccination", notes: "7-in-1 Websters, weaner dose 1ml. 70 head processed." },
    { ...hr(4), date: daysAgo(42), treatment_type_raw: "Vaccination", notes: "7-in-1 Websters, weaner dose 1ml. 65 head processed." },
    { ...hr(17), date: daysAgo(35), treatment_type_raw: "Vaccination", notes: "5-in-1 Ultravac for Hereford breeders. 90 head through River Yards." },
    { ...hr(13), date: daysAgo(21), treatment_type_raw: "Drenching", notes: "Ivomec Plus drench, 10ml per 50kg body weight. 55 head." },
    { ...hr(5), date: daysAgo(21), treatment_type_raw: "Drenching", notes: "Ivomec Plus drench, 10ml per 50kg body weight. 50 head." },
    { ...hr(12), date: daysAgo(28), treatment_type_raw: "Drenching", notes: "Cydectin oral drench for weaners. 70 head at East Yards." },
    { ...hr(0), date: daysAgo(45), treatment_type_raw: "Parasite Treatment", notes: "Acatak pour-on tick treatment. All breeders processed." },
    { ...hr(14), date: daysAgo(30), treatment_type_raw: "Parasite Treatment", notes: "Tick and lice treatment, Bayticol pour-on. 40 head." },
    { ...hr(0), date: daysAgo(14), treatment_type_raw: "Other", notes: "Annual BBSE for 8 working bulls. All passed. Vet: Dr. Patterson, Emerald Vet Services." },
  ]);

  // Muster records (6 records, matching iOS)
  const mr = (herdIdx: number) => ({ id: randomUUID(), user_id: uid, herd_group_id: herdIds[herdIdx], is_demo_data: true });
  await supabase.from("muster_records").insert([
    { ...mr(0), date: daysAgo(30), total_head_count: 185, cattle_yard: "Home Yards", notes: "Annual muster, all head accounted for. Good condition scores across the board." },
    { ...mr(12), date: daysAgo(42), total_head_count: 70, weaners_count: 70, branders_count: 70, cattle_yard: "East Yards", notes: "Weaner draft completed. All branded and tagged. NLIS devices applied." },
    { ...mr(4), date: daysAgo(42), total_head_count: 65, weaners_count: 65, branders_count: 65, cattle_yard: "East Yards", notes: "Heifer weaners processed same day. Vaccinated and drenched." },
    { ...mr(13), date: daysAgo(21), total_head_count: 55, cattle_yard: "Top Paddock Yards", notes: "Yearling steers mustered for drenching. Good weight gains observed." },
    { ...mr(17), date: daysAgo(35), total_head_count: 90, cattle_yard: "River Yards", notes: "Hereford breeders mustered for vaccination. 3 head with calves at foot separated." },
    { ...mr(3), date: daysAgo(7), total_head_count: 22, cattle_yard: "Back Yards", notes: "Drafted cull cows for Gracemere sale. Trucking booked for next week." },
  ]);

  // Sales records for sold herds + 2 historical (matching iOS)
  const saleyard = "Gracemere Central Queensland Livestock Exchange";
  const saleyardDist = 135; // Emerald to Gracemere km
  await supabase.from("sales_records").insert([
    // Cull Cows (22 head, 480kg, $3.20/kg)
    { id: randomUUID(), user_id: uid, herd_group_id: herdIds[3], is_demo_data: true, sale_date: daysAgo(30), head_count: 22, average_weight: 480, price_per_kg: 3.20, total_gross_value: 22 * 480 * 3.20, freight_cost: 1890, freight_distance: saleyardDist, net_value: (22 * 480 * 3.20) - 1890, sale_type: "Saleyard", sale_location: saleyard, notes: "Sold at CQLX weekly sale. 22 head, avg 480kg." },
    // Cull Bulls (5 head, 780kg, $2.90/kg)
    { id: randomUUID(), user_id: uid, herd_group_id: herdIds[11], is_demo_data: true, sale_date: daysAgo(60), head_count: 5, average_weight: 780, price_per_kg: 2.90, total_gross_value: 5 * 780 * 2.90, freight_cost: 945, freight_distance: saleyardDist, net_value: (5 * 780 * 2.90) - 945, sale_type: "Saleyard", sale_location: saleyard, notes: "Sold at CQLX weekly sale. 5 head, avg 780kg." },
    // Grown Steers (32 head, 520kg, $3.85/kg)
    { id: randomUUID(), user_id: uid, herd_group_id: herdIds[15], is_demo_data: true, sale_date: daysAgo(240), head_count: 32, average_weight: 520, price_per_kg: 3.85, total_gross_value: 32 * 520 * 3.85, freight_cost: 1890, freight_distance: saleyardDist, net_value: (32 * 520 * 3.85) - 1890, sale_type: "Saleyard", sale_location: saleyard, notes: "Sold at CQLX weekly sale. 32 head, avg 520kg." },
    // Brahman Feeder Heifers (25 head, 370kg, $3.65/kg)
    { id: randomUUID(), user_id: uid, herd_group_id: herdIds[19], is_demo_data: true, sale_date: daysAgo(130), head_count: 25, average_weight: 370, price_per_kg: 3.65, total_gross_value: 25 * 370 * 3.65, freight_cost: 0, freight_distance: 0, net_value: 25 * 370 * 3.65, sale_type: "Private Sale", sale_location: "Direct to feedlot buyer", notes: "Private sale, direct delivery. 25 head at $3.65/kg." },
    // Historical sale 1 (no matching herd)
    { id: randomUUID(), user_id: uid, herd_group_id: randomUUID(), is_demo_data: true, sale_date: monthsAgo(4), head_count: 35, average_weight: 480, price_per_kg: 3.70, total_gross_value: 35 * 480 * 3.70, freight_cost: 1890, freight_distance: saleyardDist, net_value: (35 * 480 * 3.70) - 1890, sale_type: "Saleyard", sale_location: saleyard, notes: "Grown steers sold at CQLX autumn sale. Good clearance." },
    // Historical sale 2 (no matching herd)
    { id: randomUUID(), user_id: uid, herd_group_id: randomUUID(), is_demo_data: true, sale_date: monthsAgo(6), head_count: 80, average_weight: 350, price_per_kg: 4.15, total_gross_value: 80 * 350 * 4.15, freight_cost: 0, freight_distance: 0, net_value: 80 * 350 * 4.15, sale_type: "Private Sale", sale_location: "Doongara Station - paddock sale", notes: "Yearling steers, buyer collected. Repeat buyer from last year." },
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/herds");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/tools/yard-book");
  return { success: true };
}

// Removes demo data only - real user data is never touched
export async function clearDemoData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const now = new Date().toISOString();
  const del = { is_deleted: true, deleted_at: now, updated_at: now };

  // Clear child records before parents (FK constraints)
  await Promise.all([
    supabase.from("yard_book_items").update(del).eq("user_id", user.id).eq("is_demo_data", true),
    supabase.from("muster_records").update(del).eq("user_id", user.id).eq("is_demo_data", true),
    supabase.from("health_records").update(del).eq("user_id", user.id).eq("is_demo_data", true),
    supabase.from("sales_records").update(del).eq("user_id", user.id).eq("is_demo_data", true),
  ]);
  await supabase.from("herd_groups").update(del).eq("user_id", user.id).eq("is_demo_data", true);
  await supabase.from("properties").update({ ...del }).eq("user_id", user.id).eq("is_simulated", true);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/herds");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/tools/yard-book");
  return { success: true };
}

// Clears ALL user data (herds, records, properties, etc.) from the cloud via Edge Function.
// Account remains active. Affects both web app and iOS app (shared Supabase backend).
export async function clearAllUserData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get the user's JWT to authenticate with the Edge Function
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token;
  if (!jwt) return { error: "No active session" };

  // Call the clear-user-data Edge Function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/clear-user-data`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error || `Server error (${response.status})` };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/herds");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/tools/yard-book");
  return { success: true };
}
