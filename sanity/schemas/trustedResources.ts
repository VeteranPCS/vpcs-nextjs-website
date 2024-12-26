import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'trusted_resources',
    title: 'Trusted Resources',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
        }),
        defineField({
            name: 'url',
            title: 'Url',
            type: 'url',
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
    ],
    preview: {
        select: {
            title: 'name',
            media: 'logo',
        },
    },
})
