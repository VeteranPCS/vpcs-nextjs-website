import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'moving_your_life',
    title: 'Moving Your Life',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
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
