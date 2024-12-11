import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'additionalSuccessStories',
    title: 'Additional Success Stories',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string'
        }),
        defineField({
            name: 'Description',
            title: 'Description',
            type: 'blockContent',
        }),
        defineField({
            name: 'image',
            title: 'Image',
            type: 'image',
            options: {
                hotspot: true,
            },
            fields: [
                {
                    name: 'alt',
                    type: 'string',
                    title: 'Alternative Text',
                }
            ]
        }),
    ],
    preview: {
        select: {
          title: 'title',
          media: 'image',
        }
      },
})
