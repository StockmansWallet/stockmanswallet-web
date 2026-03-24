import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const VALID_ROLES = ['producer', 'advisor', 'other'] as const
const VALID_HERD_SIZES = ['under_50', '50_500', '500_2000', '2000_plus'] as const
const VALID_PROPERTY_COUNTS = ['1', '2_plus'] as const

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, role, postcode, herd_size, property_count } = body

    // Email is always required
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Build the insert payload, only including fields that are present
    const record: Record<string, string> = {
      email: email.toLowerCase().trim(),
    }

    if (name && typeof name === 'string') {
      record.name = name.trim()
    }
    if (role && VALID_ROLES.includes(role)) {
      record.role = role
    }
    if (postcode && typeof postcode === 'string') {
      record.postcode = postcode.trim()
    }
    if (herd_size && VALID_HERD_SIZES.includes(herd_size)) {
      record.herd_size = herd_size
    }
    if (property_count && VALID_PROPERTY_COUNTS.includes(property_count)) {
      record.property_count = property_count
    }

    const { error } = await supabase
      .from('waitlist')
      .insert(record)

    if (error) {
      // Unique constraint violation: email already on waitlist
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'Already on waitlist' })
      }
      console.error('Waitlist insert error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Added to waitlist' })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
