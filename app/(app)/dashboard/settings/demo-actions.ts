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
// event_time column is timestamptz - build a full timestamp with the desired time
function timeOfDay(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
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
    supabase.from("herds").update(del).eq("user_id", user.id).eq("is_demo_data", true),
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
      notes: "Breeding and growing operation. Primary saleyard: Gracemere CQLX.",
    });

  if (propError) return { error: propError.message };

  // Pre-generate herd UUIDs so child records can reference them
  const herdIds = Array.from({ length: 18 }, () => randomUUID());

  const defaultSaleyard = "Gracemere Central Queensland Livestock Exchange";
  const base = (idx: number) => ({
    id: herdIds[idx],
    user_id: uid, property_id: pid, is_demo_data: true,
    is_breeder: false, is_pregnant: false, is_sold: false, calving_rate: 0.85,
    selected_saleyard: defaultSaleyard,
    mortality_rate: 0.03,
    created_at: daysAgo(0),
  });

  // 18 herds: 14 active, 4 sold. Aligned with iOS demo data.
  const { error: herdsError } = await supabase.from("herds").insert([
    // BREEDERS (4 herds)
    {
      ...base(0), name: "Main Breeders", species: "Cattle", breed: "Droughtmaster",
      sex: "Female", category: "Breeder", sub_category: "Cow", breeder_sub_type: "Cow",
      age_months: 48, head_count: 185, initial_weight: 540, current_weight: 540,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: true,
      calving_rate: 0.88, breeding_program_type: "ai",
      joined_date: daysAgo(210),
      joining_period_start: daysAgo(240), joining_period_end: daysAgo(180),
      paddock_name: "Home Paddock",
      notes: "AI program, Doongara Dozer sire line. PTIC 88%.",
      additional_info: "AI sire: Doongara Dozer D42. Synch program Oct.",
      created_at: daysAgo(280),
    },
    {
      ...base(1), name: "First-Calf Heifers", species: "Cattle", breed: "Brangus",
      sex: "Female", category: "Breeder", sub_category: "Heifer", breeder_sub_type: "Heifer",
      age_months: 26, head_count: 42, initial_weight: 420, current_weight: 420,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: true,
      calving_rate: 0.82, breeding_program_type: "controlled",
      joined_date: daysAgo(240),
      calving_processed_date: daysAgo(30),
      joining_period_start: daysAgo(270), joining_period_end: daysAgo(220),
      paddock_name: "River Paddock",
      notes: "First calvers, calves at foot. 34 calves dropped so far.",
      additional_info: "Calves at foot. Avg calf weight ~80kg.",
      created_at: daysAgo(210),
    },
    {
      ...base(2), name: "Wet Cows", species: "Cattle", breed: "Droughtmaster",
      sex: "Female", category: "Breeder", sub_category: "Cow", breeder_sub_type: "Cow",
      age_months: 54, head_count: 60, initial_weight: 510, current_weight: 510,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: false,
      calving_rate: 0.90, lactation_status: "Lactating",
      calving_processed_date: daysAgo(60),
      paddock_name: "Creek Paddock",
      notes: "Calves at foot, good condition. Creek paddock feed holding well.",
      additional_info: "54 calves at foot. Weaning target May.",
      created_at: daysAgo(180),
    },
    {
      ...base(3), name: "Hereford Breeders", species: "Cattle", breed: "Poll Hereford",
      sex: "Female", category: "Breeder", sub_category: "Cow", breeder_sub_type: "Cow",
      age_months: 42, head_count: 90, initial_weight: 560, current_weight: 560,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: true,
      calving_rate: 0.85, breeding_program_type: "uncontrolled",
      joined_date: daysAgo(180),
      selected_saleyard: "Roma Saleyards",
      paddock_name: "South Paddock",
      notes: "Natural joining, River Paddock bulls.",
      created_at: daysAgo(320),
    },

    // HEIFERS (2 herds)
    {
      ...base(4), name: "Weaner Heifers", species: "Cattle", breed: "Droughtmaster",
      sex: "Female", category: "Heifer", sub_category: "Weaner",
      age_months: 7, head_count: 65, initial_weight: 220, current_weight: 220,
      daily_weight_gain: 0.85,
      paddock_name: "East Paddock",
      notes: "Off mothers, supplementary feed. Gaining well.",
      created_at: daysAgo(60),
    },
    {
      ...base(5), name: "Yearling Heifers", species: "Cattle", breed: "Santa Gertrudis",
      sex: "Female", category: "Heifer", sub_category: "Yearling",
      age_months: 14, head_count: 50, initial_weight: 340, current_weight: 340,
      daily_weight_gain: 0.75,
      selected_saleyard: "Emerald Saleyards",
      paddock_name: "North Paddock",
      notes: "Growing well on improved pasture.",
      created_at: daysAgo(150),
    },

    // STEERS (5 herds)
    {
      ...base(6), name: "Weaner Steers", species: "Cattle", breed: "Droughtmaster",
      sex: "Male", category: "Steer", sub_category: "Weaner",
      age_months: 7, head_count: 70, initial_weight: 230, current_weight: 230,
      daily_weight_gain: 1.1,
      paddock_name: "East Paddock",
      notes: "Fresh off mothers, strong weaners.",
      created_at: daysAgo(55),
    },
    {
      ...base(7), name: "Yearling Steers", species: "Cattle", breed: "Brangus",
      sex: "Male", category: "Steer", sub_category: "Yearling",
      age_months: 14, head_count: 55, initial_weight: 340, current_weight: 340,
      daily_weight_gain: 0.85,
      paddock_name: "Top Paddock",
      notes: "Good growth rates on improved pasture.",
      created_at: daysAgo(170),
    },
    {
      ...base(8), name: "Feeder Steers", species: "Cattle", breed: "Angus",
      sex: "Male", category: "Steer", sub_category: "Yearling",
      age_months: 18, head_count: 40, initial_weight: 380, current_weight: 380,
      daily_weight_gain: 1.0,
      previous_dwg: 0.6, dwg_change_date: daysAgo(45),
      paddock_name: "Hill Paddock",
      notes: "Moved from native pasture to improved. DWG lifted from 0.6 to 1.0.",
      created_at: daysAgo(220),
    },
    {
      ...base(9), name: "Wagyu Weaners", species: "Cattle", breed: "Wagyu",
      sex: "Male", category: "Steer", sub_category: "Weaner",
      age_months: 9, head_count: 25, initial_weight: 260, current_weight: 260,
      daily_weight_gain: 0.9,
      selected_saleyard: "Dalby Regional Saleyards",
      paddock_name: "West Paddock",
      notes: "Purchased at Dalby. High-value genetics.",
      created_at: daysAgo(50),
    },
    {
      ...base(10), name: "Droughtmaster Yearlings", species: "Cattle", breed: "Droughtmaster",
      sex: "Male", category: "Steer", sub_category: "Yearling",
      age_months: 15, head_count: 60, initial_weight: 350, current_weight: 350,
      daily_weight_gain: 0.9,
      paddock_name: "Bore Paddock",
      notes: "Good weight gain on native pasture.",
      created_at: daysAgo(140),
    },

    // BULLS (2 herds)
    {
      ...base(11), name: "Herd Bulls", species: "Cattle", breed: "Brahman",
      sex: "Male", category: "Bull", sub_category: "Grown",
      age_months: 48, head_count: 8, initial_weight: 850, current_weight: 850,
      daily_weight_gain: 0,
      paddock_name: "Home Paddock",
      notes: "Working bulls, annual BBSE completed.",
      created_at: daysAgo(365),
    },
    {
      ...base(12), name: "Young Bulls", species: "Cattle", breed: "Droughtmaster",
      sex: "Male", category: "Bull", sub_category: "Yearling",
      age_months: 18, head_count: 12, initial_weight: 400, current_weight: 400,
      daily_weight_gain: 0.8,
      paddock_name: "Rocky Paddock",
      notes: "Bull selection draft pending.",
      created_at: daysAgo(160),
    },

    // DRY COW (1 herd)
    {
      ...base(13), name: "Cull Cows", species: "Cattle", breed: "Mixed Breed",
      sex: "Female", category: "Dry Cow", sub_category: "Cows",
      age_months: 84, head_count: 22, initial_weight: 480, current_weight: 480,
      daily_weight_gain: 0,
      paddock_name: "Back Paddock",
      notes: "Drafted for next Gracemere sale.",
      created_at: daysAgo(45),
    },

    // SOLD HERDS (4)
    {
      ...base(14), name: "Grown Steers (sold)", species: "Cattle", breed: "Charolais",
      sex: "Male", category: "Steer", sub_category: "Grown",
      age_months: 26, head_count: 32, initial_weight: 520, current_weight: 520,
      daily_weight_gain: 0.5, is_sold: true, sold_date: daysAgo(240), sold_price: 3.85,
      paddock_name: "South Paddock",
      notes: "Sold at CQLX weekly sale.",
      created_at: daysAgo(300),
    },
    {
      ...base(15), name: "Cull Bulls (sold)", species: "Cattle", breed: "Mixed Breed",
      sex: "Male", category: "Bull", sub_category: "Grown",
      age_months: 72, head_count: 5, initial_weight: 780, current_weight: 780,
      daily_weight_gain: 0, is_sold: true, sold_date: daysAgo(60), sold_price: 2.90,
      paddock_name: "Back Paddock",
      notes: "Past working age.",
      created_at: daysAgo(120),
    },
    {
      ...base(16), name: "Brahman Feeder Heifers (sold)", species: "Cattle", breed: "Brahman",
      sex: "Female", category: "Heifer", sub_category: "Yearling",
      age_months: 17, head_count: 25, initial_weight: 370, current_weight: 370,
      daily_weight_gain: 0.6, is_sold: true, sold_date: daysAgo(130), sold_price: 3.65,
      paddock_name: "Bore Paddock",
      notes: "Private sale to feedlot.",
      created_at: daysAgo(190),
    },
    {
      ...base(17), name: "Angus Yearling Steers (sold)", species: "Cattle", breed: "Angus",
      sex: "Male", category: "Steer", sub_category: "Yearling",
      age_months: 16, head_count: 48, initial_weight: 420, current_weight: 420,
      daily_weight_gain: 0.7, is_sold: true, sold_date: daysAgo(180), sold_price: 4.20,
      paddock_name: "North Paddock",
      notes: "Private sale, buyer collected.",
      created_at: daysAgo(240),
    },
  ]);

  if (herdsError) return { error: herdsError.message };

  // Yard book items (21 events across 5 categories, matching iOS)
  const yb = () => ({ id: randomUUID(), user_id: uid, property_id: pid, is_demo_data: true, is_all_day: true, is_completed: false, is_recurring: false, notifications_scheduled: false });
  await supabase.from("yard_book_items").insert([
    // LIVESTOCK (6)
    { ...yb(), title: "Weaner processing - brand, tag, vaccinate", event_date: daysAgo(42), category_raw: "Livestock", is_completed: true, completed_date: daysAgo(42), notes: "Full weaner processing. 70 steer + 65 heifer weaners branded, tagged, NLIS applied, 7-in-1 vaccinated.", linked_herd_ids: [herdIds[4], herdIds[6]] },
    { ...yb(), title: "Pregnancy testing - Main Breeders", event_date: daysAgo(14), category_raw: "Livestock", is_completed: true, completed_date: daysAgo(14), notes: "Vet confirmed 88% conception rate. 12 empties drafted for Gracemere.", linked_herd_ids: [herdIds[0], herdIds[1]] },
    { ...yb(), title: "Cull cows to CQLX sale", event_date: daysFromNow(7), category_raw: "Livestock", notes: "22 head cull cows. B-double booked with CQ Transport.", reminder_offsets: [7, 1], linked_herd_ids: [herdIds[13]] },
    { ...yb(), title: "Transport weaners to Gracemere", event_date: daysFromNow(21), category_raw: "Livestock", notes: "B-double booked. 70 head weaner steers for CQLX feature sale.", reminder_offsets: [7, 3], linked_herd_ids: [herdIds[6]] },
    { ...yb(), title: "Feeder steers - weigh and assess", event_date: daysFromNow(14), category_raw: "Livestock", notes: "Weigh feeder steers on improved pasture. Target 420kg+ for processor grid.", reminder_offsets: [3], linked_herd_ids: [herdIds[8]] },
    { ...yb(), title: "BBSE - annual bull assessment", event_date: daysAgo(90), category_raw: "Livestock", is_completed: true, completed_date: daysAgo(90), notes: "8 working bulls passed BBSE. Dr Patterson, Emerald Vet Services.", linked_herd_ids: [herdIds[11], herdIds[12]] },
    // OPERATIONS (5)
    { ...yb(), title: "Annual vaccination - 5-in-1", event_date: daysAgo(60), category_raw: "Operations", is_completed: true, completed_date: daysAgo(60), is_recurring: true, recurrence_rule_raw: "Annual", notes: "5-in-1 Ultravac for all breeders and weaners. Completed by vet.", linked_herd_ids: [herdIds[0]] },
    { ...yb(), title: "Drenching round - yearlings", event_date: daysAgo(21), category_raw: "Operations", is_completed: true, completed_date: daysAgo(21), notes: "Ivomec Plus drench for yearling steers and heifers." },
    { ...yb(), title: "Water infrastructure check", event_date: daysFromNow(5), category_raw: "Operations", is_recurring: true, recurrence_rule_raw: "Monthly", notes: "Check bore pump, all troughs, and turkey nest dam levels.", reminder_offsets: [1] },
    { ...yb(), title: "Crush and yard maintenance", event_date: daysFromNow(28), category_raw: "Operations", notes: "Replace crush head bail latch. Check yard rails East Yards." },
    { ...yb(), title: "Paddock rotation - move yearlings", event_date: daysFromNow(10), category_raw: "Operations", is_recurring: true, recurrence_rule_raw: "Fortnightly", notes: "Rotate yearling steers from Top Paddock to Bore Paddock. Spell Top Paddock for 6 weeks." },
    // FINANCE (3)
    { ...yb(), title: "BAS lodgement", event_date: daysFromNow(30), category_raw: "Finance", is_recurring: true, recurrence_rule_raw: "Monthly", notes: "Quarterly BAS due. Send invoices to accountant.", reminder_offsets: [14, 7] },
    { ...yb(), title: "Livestock insurance renewal", event_date: daysFromNow(60), category_raw: "Finance", is_recurring: true, recurrence_rule_raw: "Annual", notes: "Review policy with broker. Update herd values from portfolio.", reminder_offsets: [30, 7] },
    { ...yb(), title: "Accountant meeting - quarterly review", event_date: daysFromNow(35), category_raw: "Finance", is_all_day: false, event_time: timeOfDay(10, 0), notes: "Quarterly review with accountant. Bring sale receipts and freight invoices." },
    // FAMILY (3)
    { ...yb(), title: "School holidays start", event_date: daysFromNow(25), category_raw: "Family", notes: "Kids home for 2 weeks. Plan station activities." },
    { ...yb(), title: "Wedding anniversary", event_date: daysAgo(8), category_raw: "Family", is_completed: true, completed_date: daysAgo(8), notes: "Dinner in Emerald." },
    { ...yb(), title: "Pony Club rally day", event_date: daysFromNow(3), category_raw: "Family", notes: "Emerald Pony Club. Drop kids 8am, pick up 3pm.", reminder_offsets: [1] },
    // ME (4)
    { ...yb(), title: "GP appointment", event_date: daysFromNow(10), category_raw: "Me", is_all_day: false, event_time: timeOfDay(14, 30), notes: "Annual check-up. Dr Wilson, Emerald Medical Centre.", reminder_offsets: [1] },
    { ...yb(), title: "Rotary meeting", event_date: daysFromNow(18), category_raw: "Me", is_all_day: false, event_time: timeOfDay(18, 0), is_recurring: true, recurrence_rule_raw: "Monthly", notes: "Emerald Rotary Club monthly dinner." },
    { ...yb(), title: "Fishing trip - Fairbairn Dam", event_date: daysFromNow(28), category_raw: "Me", notes: "Weekend trip with mates. Barramundi season." },
    { ...yb(), title: "Ag-Grow field day", event_date: daysFromNow(42), category_raw: "Me", notes: "Annual Emerald Ag-Grow. Check new fencing equipment.", reminder_offsets: [7, 1] },
  ]);

  // Health records (14 records, matching iOS)
  const hr = (herdIdx: number) => ({ id: randomUUID(), user_id: uid, herd_id: herdIds[herdIdx], is_demo_data: true });
  await supabase.from("health_records").insert([
    // Vaccinations (5)
    { ...hr(0), date: daysAgo(60), treatment_type_raw: "Vaccination", notes: "5-in-1 Ultravac, 2ml subcutaneous. All 185 head processed through Home Yards." },
    { ...hr(6), date: daysAgo(42), treatment_type_raw: "Vaccination", notes: "7-in-1 Websters, weaner dose 1ml. 70 head processed." },
    { ...hr(4), date: daysAgo(42), treatment_type_raw: "Vaccination", notes: "7-in-1 Websters, weaner dose 1ml. 65 head processed." },
    { ...hr(3), date: daysAgo(35), treatment_type_raw: "Vaccination", notes: "5-in-1 Ultravac for Hereford breeders. 90 head through River Yards." },
    { ...hr(7), date: daysAgo(90), treatment_type_raw: "Vaccination", notes: "Clostridial booster, 5-in-1 Ultravac. 55 head at Top Paddock Yards." },
    // Drenching (4)
    { ...hr(7), date: daysAgo(21), treatment_type_raw: "Drenching", notes: "Ivomec Plus drench, 10ml per 50kg body weight. 55 head." },
    { ...hr(5), date: daysAgo(21), treatment_type_raw: "Drenching", notes: "Ivomec Plus drench, 10ml per 50kg body weight. 50 head." },
    { ...hr(6), date: daysAgo(28), treatment_type_raw: "Drenching", notes: "Cydectin oral drench for weaners. 70 head at East Yards." },
    { ...hr(8), date: daysAgo(14), treatment_type_raw: "Drenching", notes: "Dectomax injectable, 1ml per 50kg. 40 head at Hill Paddock." },
    // Parasite treatments (3)
    { ...hr(0), date: daysAgo(45), treatment_type_raw: "Parasite Treatment", notes: "Acatak pour-on tick treatment. All breeders processed at Home Yards." },
    { ...hr(8), date: daysAgo(30), treatment_type_raw: "Parasite Treatment", notes: "Bayticol pour-on for tick and lice. 40 head." },
    { ...hr(5), date: daysAgo(50), treatment_type_raw: "Parasite Treatment", notes: "Clik pour-on for flystrike prevention. 50 head at North Yards." },
    // Preg testing + BBSE (2)
    { ...hr(0), date: daysAgo(14), treatment_type_raw: "Other", notes: "Preg tested by Dr Patterson, Emerald Vet Services. 88% PTIC, 12 empties drafted." },
    { ...hr(11), date: daysAgo(90), treatment_type_raw: "Other", notes: "Annual BBSE for 8 working bulls. All passed. Vet: Dr Patterson, Emerald Vet Services." },
  ]);

  // Muster records (10 records, matching iOS)
  const mr = (herdIdx: number) => ({ id: randomUUID(), user_id: uid, herd_id: herdIds[herdIdx], is_demo_data: true });
  await supabase.from("muster_records").insert([
    { ...mr(0), date: daysAgo(30), total_head_count: 185, cattle_yard: "Home Yards", notes: "Annual muster, all head accounted for. Good condition scores across the board." },
    { ...mr(6), date: daysAgo(42), total_head_count: 70, weaners_count: 70, branders_count: 70, cattle_yard: "East Yards", notes: "Weaner draft completed. All branded and tagged. NLIS devices applied." },
    { ...mr(4), date: daysAgo(42), total_head_count: 65, weaners_count: 65, branders_count: 65, cattle_yard: "East Yards", notes: "Heifer weaners processed same day. Vaccinated and drenched." },
    { ...mr(7), date: daysAgo(21), total_head_count: 55, cattle_yard: "Top Paddock Yards", notes: "Yearling steers mustered for drenching. Good weight gains observed." },
    { ...mr(3), date: daysAgo(35), total_head_count: 90, cattle_yard: "River Yards", notes: "Hereford breeders mustered for vaccination. 3 head with calves at foot separated." },
    { ...mr(13), date: daysAgo(7), total_head_count: 22, cattle_yard: "Back Yards", notes: "Drafted cull cows for Gracemere sale. Trucking booked for next week." },
    { ...mr(11), date: daysAgo(90), total_head_count: 8, cattle_yard: "Home Yards", notes: "Bulls mustered for annual BBSE. All passed and returned to paddock." },
    { ...mr(2), date: daysAgo(45), total_head_count: 60, cattle_yard: "Creek Yards", notes: "Creek paddock muster. 54 calves at foot confirmed. All in good condition." },
    { ...mr(9), date: daysAgo(14), total_head_count: 25, cattle_yard: "West Paddock Yards", notes: "Wagyu weaners yard check. Weights estimated 290-310kg. Growing well." },
    { ...mr(8), date: daysAgo(60), total_head_count: 40, cattle_yard: "Hill Paddock Yards", notes: "Feeder steers mustered for paddock move. Shifted to improved pasture." },
  ]);

  // Sales records for sold herds + 4 historical (matching iOS)
  const saleyard = "Gracemere Central Queensland Livestock Exchange";
  const saleyardDist = 270;
  await supabase.from("sales_records").insert([
    // Grown Steers (sold) - saleyard
    { id: randomUUID(), user_id: uid, herd_id: herdIds[14], is_demo_data: true, sale_date: daysAgo(240), head_count: 32, average_weight: 520, price_per_kg: 3.85, total_gross_value: 32 * 520 * 3.85, freight_cost: 1890, freight_distance: saleyardDist, net_value: (32 * 520 * 3.85) - 1890, sale_type: "Saleyard", sale_location: saleyard, notes: "Sold at CQLX weekly sale. 32 head, avg 520kg." },
    // Cull Bulls (sold) - saleyard
    { id: randomUUID(), user_id: uid, herd_id: herdIds[15], is_demo_data: true, sale_date: daysAgo(60), head_count: 5, average_weight: 780, price_per_kg: 2.90, total_gross_value: 5 * 780 * 2.90, freight_cost: 945, freight_distance: saleyardDist, net_value: (5 * 780 * 2.90) - 945, sale_type: "Saleyard", sale_location: saleyard, notes: "Sold at CQLX weekly sale. 5 head, avg 780kg." },
    // Brahman Feeder Heifers (sold) - private
    { id: randomUUID(), user_id: uid, herd_id: herdIds[16], is_demo_data: true, sale_date: daysAgo(130), head_count: 25, average_weight: 370, price_per_kg: 3.65, total_gross_value: 25 * 370 * 3.65, freight_cost: 0, freight_distance: 0, net_value: 25 * 370 * 3.65, sale_type: "Private Sale", sale_location: "Direct to feedlot buyer", notes: "Private sale, direct delivery. 25 head at $3.65/kg." },
    // Angus Yearling Steers (sold) - private
    { id: randomUUID(), user_id: uid, herd_id: herdIds[17], is_demo_data: true, sale_date: daysAgo(180), head_count: 48, average_weight: 420, price_per_kg: 4.20, total_gross_value: 48 * 420 * 4.20, freight_cost: 0, freight_distance: 0, net_value: 48 * 420 * 4.20, sale_type: "Private Sale", sale_location: "Doongara Station - paddock sale", notes: "Private sale, buyer collected. 48 head at $4.20/kg." },
    // Historical sale 1 - saleyard, 4 months ago
    { id: randomUUID(), user_id: uid, herd_id: randomUUID(), is_demo_data: true, sale_date: monthsAgo(4), head_count: 35, average_weight: 480, price_per_kg: 3.70, total_gross_value: 35 * 480 * 3.70, freight_cost: 1890, freight_distance: saleyardDist, net_value: (35 * 480 * 3.70) - 1890, sale_type: "Saleyard", sale_location: saleyard, notes: "Grown steers sold at CQLX autumn sale. Good clearance." },
    // Historical sale 2 - private, 6 months ago
    { id: randomUUID(), user_id: uid, herd_id: randomUUID(), is_demo_data: true, sale_date: monthsAgo(6), head_count: 80, average_weight: 350, price_per_kg: 4.15, total_gross_value: 80 * 350 * 4.15, freight_cost: 0, freight_distance: 0, net_value: 80 * 350 * 4.15, sale_type: "Private Sale", sale_location: "Doongara Station - paddock sale", notes: "Yearling steers, buyer collected. Repeat buyer from last year." },
    // Historical sale 3 - Roma saleyard, 9 months ago
    { id: randomUUID(), user_id: uid, herd_id: randomUUID(), is_demo_data: true, sale_date: monthsAgo(9), head_count: 18, average_weight: 500, price_per_kg: 3.45, total_gross_value: 18 * 500 * 3.45, freight_cost: 2660, freight_distance: 380, net_value: (18 * 500 * 3.45) - 2660, sale_type: "Saleyard", sale_location: "Roma Saleyards", notes: "Cull cows at Roma store sale. Reasonable prices for older stock." },
    // Historical sale 4 - per-head weaner sale, 11 months ago
    { id: randomUUID(), user_id: uid, herd_id: randomUUID(), is_demo_data: true, sale_date: monthsAgo(11), head_count: 45, average_weight: 240, price_per_kg: 0, pricing_type: "per_head", price_per_head: 1250, total_gross_value: 45 * 1250, freight_cost: 1890, freight_distance: saleyardDist, net_value: (45 * 1250) - 1890, sale_type: "Saleyard", sale_location: saleyard, notes: "Weaner steers sold per head at CQLX feature sale. Strong competition." },
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
  await supabase.from("herds").update(del).eq("user_id", user.id).eq("is_demo_data", true);
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
