import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'users',
    title: 'Users',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
        }),
        defineField({
            name: 'userImage',
            title: 'User Image',
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
        defineField({
            name: 'publishedAt',
            title: 'Published at',
            type: 'datetime',
        }),
    ],

    preview: {
        select: {
            title: 'title',
            media: 'userImage',
            subtitle: 'publishedAt',
        },
        prepare({ title, media, subtitle }) {
            return {
                title,
                media,
                subtitle: subtitle ? `Published at: ${new Date(subtitle).toLocaleDateString()}` : 'No publish date',
            };
        },
    },
})
