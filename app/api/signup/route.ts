import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // TODO: Forward to your email service (Supabase, Mailchimp, ConvertKit, etc.)
    console.log(`New waitlist signup: ${email}`)

    return NextResponse.json({ success: true, message: 'Added to waitlist' })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
