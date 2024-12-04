import { NextResponse } from 'next/server'
import { client } from '../../../sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'

interface PostDocument extends SanityDocument {
  _type: 'post'
  title: string
  publishedAt: string
}

// export async function GET() {
//   try {
//     const posts = await client.fetch<PostDocument[]>(`*[_type == "post"]`)
//     return NextResponse.json(posts)
//   } catch (error) {
//     return NextResponse.json({ error: 'Error fetching posts' }, { status: 500 })
//   }
// }

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const post = await client.fetch<PostDocument>(
        `*[_type == "post" && slug.current == $id][0]`,
        { id } 
      )

      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      return NextResponse.json(post)
    } else {
      const posts = await client.fetch<PostDocument[]>(`*[_type == "post"]{
        ...,
        author->{
          name,
          _id
        },
        categories[]->{
          title,
          _id
        },
      }`);

      posts.forEach((post) => {
        if (post.mainImage?.asset?._ref) {
          post.mainImage.asset.image_url = urlForImage(post.mainImage.asset);  // Add the image URL to the response
        }
      })

      return NextResponse.json(posts);
    }
  } catch (error) {
    return NextResponse.json({ error: `Error fetching post(s): ${error}` }, { status: 500 })
  }
}

// export async function POST(request: Request) {
//   try {
//     // console.log({...request})
//     const post = await request.json()
//     console.log(post)
//     const result = await client.create({
//       _type: 'post',
//       post
//     })
//     return NextResponse.json(result, { status: 201 })
//   } catch (error) {
//     return NextResponse.json({ error: `Error creating post: ${error}` }, { status: 500 })
//   }
// }

export async function POST(request: Request) {
  try {
    const post = await request.json()
    const result = await client.create(post)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: `Error creating post: ${error}` }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json()
    const result = await client
      .patch(id)
      .set(data)
      .commit()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Error updating post' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    const result = await client.delete(id)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting post' }, { status: 500 })
  }
}
