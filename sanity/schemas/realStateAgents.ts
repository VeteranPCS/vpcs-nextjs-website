import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'real_state_agents',
    title: 'Real State Agents',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
        }),
        defineField({
            name: 'url',
            title: 'URL',
            type: 'url',
        }),
        defineField({
            name: 'mainImage',
            title: 'Main image',
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
            media: 'mainImage',
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
