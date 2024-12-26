import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'military_spouse_approved',
    title: 'Military Spouse Approved',
    type: 'document',
    fields: [
        defineField({
            name: 'component_title',
            title: 'Component Title',
            type: 'string',
        }),
        defineField({
            name: 'header',
            title: 'Header',
            type: 'text',
        }),
        defineField({
            name: 'description',
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
            title: 'component_title',
            media: 'image',
        },
    },
})
