"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function seedDemoData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Remove any existing demo data only — real user data is untouched
  await supabase.from("herds").delete().eq("user_id", user.id).eq("is_demo_data", true);
  await supabase.from("properties").delete().eq("user_id", user.id).eq("is_simulated", true);

  // Insert Doongara Station (flagged as demo/simulated)
  const { data: property, error: propError } = await supabase
    .from("properties")
    .insert({
      user_id: user.id,
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
      notes: "Demo property — Doongara Station, Central Queensland",
    })
    .select("id")
    .single();

  if (propError || !property) {
    return { error: propError?.message ?? "Failed to create property" };
  }

  const pid = property.id;
  const uid = user.id;

  // All 20 herds flagged with is_demo_data: true
  const { error: herdsError } = await supabase.from("herds").insert([
    // ── COWS ──
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Main Breeders", species: "Cattle", breed: "Droughtmaster",
      sex: "Female", category: "Breeder Cow",
      age_months: 48, head_count: 185, initial_weight: 540, current_weight: 540,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: true,
      calving_rate: 88, breeding_program_type: "ai",
      paddock_name: "Home Paddock",
      selected_saleyard: "Gracemere Central Queensland Livestock Exchange (CQLX)",
      notes: "AI program, Doongara Dozer sire line",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "First-Calf Heifers", species: "Cattle", breed: "Brangus",
      sex: "Female", category: "Breeder Heifer",
      age_months: 26, head_count: 45, initial_weight: 380, current_weight: 420,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: true,
      calving_rate: 82, breeding_program_type: "controlled",
      paddock_name: "River Paddock",
      selected_saleyard: "Gracemere Central Queensland Livestock Exchange (CQLX)",
      notes: "First calvers, controlled joining",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Wet Cows", species: "Cattle", breed: "Droughtmaster",
      sex: "Female", category: "Wet Cow",
      age_months: 54, head_count: 60, initial_weight: 510, current_weight: 510,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: false,
      calving_rate: 90, lactation_status: "Lactating",
      paddock_name: "Creek Paddock",
      notes: "Calves at foot, good condition",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Cull Cows", species: "Cattle", breed: "Mixed Breed",
      sex: "Female", category: "Cull Cow",
      age_months: 84, head_count: 22, initial_weight: 480, current_weight: 480,
      daily_weight_gain: 0, is_sold: true,
      paddock_name: "Back Paddock",
      notes: "Drafted for Gracemere sale",
    },
    // ── HEIFERS ──
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Weaner Heifers", species: "Cattle", breed: "Droughtmaster",
      sex: "Female", category: "Weaner Heifer",
      age_months: 7, head_count: 65, initial_weight: 160, current_weight: 220,
      daily_weight_gain: 0.85,
      paddock_name: "East Paddock",
      notes: "Off mothers, supplementary feed",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Yearling Heifers", species: "Cattle", breed: "Brangus",
      sex: "Female", category: "Yearling Heifer",
      age_months: 14, head_count: 50, initial_weight: 200, current_weight: 310,
      daily_weight_gain: 0.75,
      paddock_name: "North Paddock",
      notes: "Growing well on improved pasture",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Feeder Heifers", species: "Cattle", breed: "Charolais",
      sex: "Female", category: "Feeder Heifer",
      age_months: 18, head_count: 35, initial_weight: 250, current_weight: 380,
      daily_weight_gain: 0.65,
      paddock_name: "South Paddock",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Grown Heifers (Un-Joined)", species: "Cattle", breed: "Angus",
      sex: "Female", category: "Grown Heifer (Un-Joined)",
      age_months: 24, head_count: 28, initial_weight: 380, current_weight: 440,
      daily_weight_gain: 0.3,
      paddock_name: "West Paddock",
      notes: "Ready to join next season",
    },
    // ── BULLS ──
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Weaner Bulls", species: "Cattle", breed: "Brahman",
      sex: "Male", category: "Weaner Bull",
      age_months: 7, head_count: 30, initial_weight: 170, current_weight: 240,
      daily_weight_gain: 1.0,
      paddock_name: "Rocky Paddock",
      notes: "Recently weaned, monitoring growth",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Yearling Bulls", species: "Cattle", breed: "Droughtmaster",
      sex: "Male", category: "Yearling Bull",
      age_months: 15, head_count: 18, initial_weight: 230, current_weight: 360,
      daily_weight_gain: 0.9,
      paddock_name: "Bore Paddock",
      notes: "Bull selection draft pending",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Herd Bulls", species: "Cattle", breed: "Brahman",
      sex: "Male", category: "Grown Bull",
      age_months: 48, head_count: 8, initial_weight: 850, current_weight: 850,
      daily_weight_gain: 0,
      paddock_name: "Home Paddock",
      notes: "Working bulls, annual BBSE completed",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Cull Bulls", species: "Cattle", breed: "Mixed Breed",
      sex: "Male", category: "Cull Bull",
      age_months: 72, head_count: 5, initial_weight: 780, current_weight: 780,
      daily_weight_gain: 0, is_sold: true,
      paddock_name: "Back Paddock",
      notes: "Past working age",
    },
    // ── STEERS ──
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Weaner Steers", species: "Cattle", breed: "Droughtmaster",
      sex: "Male", category: "Weaner Steer",
      age_months: 7, head_count: 70, initial_weight: 160, current_weight: 230,
      daily_weight_gain: 1.1,
      paddock_name: "East Paddock",
      notes: "Fresh off mothers, strong weaners",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Yearling Steers", species: "Cattle", breed: "Brangus",
      sex: "Male", category: "Yearling Steer",
      age_months: 14, head_count: 55, initial_weight: 210, current_weight: 340,
      daily_weight_gain: 0.85,
      paddock_name: "Top Paddock",
      notes: "Good growth rates",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Feeder Steers", species: "Cattle", breed: "Angus",
      sex: "Male", category: "Feeder Steer",
      age_months: 18, head_count: 40, initial_weight: 260, current_weight: 400,
      daily_weight_gain: 0.7,
      paddock_name: "Hill Paddock",
      notes: "Feedlot-ready condition",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Grown Steers", species: "Cattle", breed: "Charolais",
      sex: "Male", category: "Grown Steer",
      age_months: 26, head_count: 32, initial_weight: 340, current_weight: 520,
      daily_weight_gain: 0.5, is_sold: true,
      paddock_name: "South Paddock",
      notes: "Near turn-off weight",
    },
    // ── ADDITIONAL ──
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Premium Angus Weaners", species: "Cattle", breed: "Angus",
      sex: "Male", category: "Weaner Steer",
      age_months: 8, head_count: 45, initial_weight: 180, current_weight: 250,
      daily_weight_gain: 1.05,
      paddock_name: "North Paddock",
      notes: "Top draft weaners, purchased at Gracemere",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Hereford Breeders", species: "Cattle", breed: "Hereford",
      sex: "Female", category: "Breeder Cow",
      age_months: 42, head_count: 90, initial_weight: 560, current_weight: 560,
      daily_weight_gain: 0, is_breeder: true, is_pregnant: true,
      calving_rate: 85, breeding_program_type: "uncontrolled",
      paddock_name: "River Paddock",
      notes: "Natural joining, River Paddock mob",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Droughtmaster Yearlings", species: "Cattle", breed: "Droughtmaster",
      sex: "Male", category: "Yearling Steer",
      age_months: 15, head_count: 60, initial_weight: 220, current_weight: 350,
      daily_weight_gain: 0.9,
      paddock_name: "West Paddock",
      notes: "Good weight gain on native pasture",
    },
    {
      user_id: uid, property_id: pid, is_demo_data: true,
      name: "Brahman Feeder Heifers", species: "Cattle", breed: "Brahman",
      sex: "Female", category: "Feeder Heifer",
      age_months: 17, head_count: 25, initial_weight: 240, current_weight: 370,
      daily_weight_gain: 0.6, is_sold: true,
      paddock_name: "Bore Paddock",
      notes: "Tropically adapted, low maintenance",
    },
  ]);

  if (herdsError) return { error: herdsError.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/herds");
  revalidatePath("/dashboard/properties");
  redirect("/dashboard");
}

// Removes demo data only — real user data is never touched
export async function clearDemoData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase.from("herds").delete().eq("user_id", user.id).eq("is_demo_data", true);
  await supabase.from("properties").delete().eq("user_id", user.id).eq("is_simulated", true);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/herds");
  revalidatePath("/dashboard/properties");
  redirect("/dashboard");
}
