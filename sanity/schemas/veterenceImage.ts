import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'veterence_logo',
    title: 'Veterence Logo',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
        }),
        defineField({
            name: 'logo',
            title: 'Logo',
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
            title: 'name',
            media: 'logo',
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
