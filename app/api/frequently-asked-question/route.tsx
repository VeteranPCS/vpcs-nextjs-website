import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'

interface AccountDocument extends SanityDocument {
    _type: 'frequently_asked_questions'
}

export async function GET() {
    try {
        const users = await client.fetch<AccountDocument[]>(`*[_type == "frequently_asked_questions"]`)
        return NextResponse.json(users)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
