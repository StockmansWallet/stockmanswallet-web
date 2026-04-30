import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VALID_ROLES = ['producer', 'advisor'] as const
const VALID_HERD_SIZES = ['under_50', '50_500', '500_2000', '2000_plus'] as const
const VALID_PROPERTY_COUNTS = ['1', '2_3', '4_plus'] as const
const VALID_FEATURES = [
  'brangus', 'freight_iq', 'herd_valuation', 'reports', 'advisory_hub',
  'yard_book', 'grid_iq', 'ch40', 'insights', 'markets',
  'advisor_lens', 'scenarios',
] as const

function normalizePropertyCount(value: string) {
  // The live waitlist table currently stores either one property or multiple properties.
  // Keep the richer UI choices working without requiring an urgent production migration.
  return value === '1' ? '1' : '2_plus'
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const body = await request.json()
    const { name, email, role, postcode, herd_size, property_count, interested_features, contact_opt_in } = body

    // Email is always required
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Build the insert payload, only including fields that are present.
    const baseRecord: Record<string, string> = {
      email: email.toLowerCase().trim(),
    }
    const record: Record<string, string | string[] | boolean> = { ...baseRecord }

    if (name && typeof name === 'string') {
      baseRecord.name = name.trim()
      record.name = baseRecord.name
    }
    if (role && VALID_ROLES.includes(role)) {
      baseRecord.role = role
      record.role = role
    }
    if (postcode && typeof postcode === 'string') {
      baseRecord.postcode = postcode.trim()
      record.postcode = baseRecord.postcode
    }
    if (herd_size && VALID_HERD_SIZES.includes(herd_size)) {
      baseRecord.herd_size = herd_size
      record.herd_size = herd_size
    }
    if (property_count && VALID_PROPERTY_COUNTS.includes(property_count)) {
      baseRecord.property_count = normalizePropertyCount(property_count)
      record.property_count = baseRecord.property_count
    }
    if (Array.isArray(interested_features) && interested_features.length > 0) {
      const validFeatures = interested_features.filter((f: string) =>
        VALID_FEATURES.includes(f as typeof VALID_FEATURES[number])
      )
      if (validFeatures.length > 0) {
        record.interested_features = validFeatures
      }
    }
    if (typeof contact_opt_in === 'boolean') {
      record.contact_opt_in = contact_opt_in
    }

    const { error } = await supabase
      .from('waitlist')
      .insert(record)

    if (error) {
      // Unique constraint violation: email already on waitlist
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'Already on waitlist' })
      }

      const { error: fallbackError } = await supabase.from('waitlist').insert(baseRecord)
      if (!fallbackError || fallbackError.code === '23505') {
        return NextResponse.json({ success: true, message: 'Added to waitlist' })
      }

      console.error('Waitlist signup failed:', error)
      console.error('Waitlist fallback signup failed:', fallbackError)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Added to waitlist' })
  } catch (error) {
    console.error('Waitlist signup failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
