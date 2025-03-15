import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'state_list',
    title: 'State List',
    type: 'document',
    fields: [
        defineField({
            name: 'state_name',
            title: 'State Name',
            type: 'string',
        }),
        defineField({
            name: 'state_slug',
            title: 'State Slug',
            type: 'slug',
            options: {
                source: 'state_name',
                maxLength: 96,
            },
        }),
        defineField({
            name: 'state_map',
            title: 'State Map',
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
            name: 'short_name',
            title: 'Short Name',
            type: 'string',
        }),
    ],
    preview: {
        select: {
            title: 'state_name',
            media: 'state_map',
        },
    },
})
