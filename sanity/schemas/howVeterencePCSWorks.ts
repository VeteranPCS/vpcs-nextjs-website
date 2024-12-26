import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'how_veterence_pcs_works',
    title: 'How Veterence PCS Works',
    type: 'document',
    fields: [
        defineField({
            name: 'component_header',
            title: 'Component Header',
            type: 'blockContent',
        }),
        defineField({
            name: 'header_slug',
            title: 'Header Slug',
            type: 'slug',
            options: {
                source: 'component_header',
                maxLength: 96,
            },
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'blockContent',
        })
    ],
    preview: {
        select: {
            title: 'component_header',
        },
    },
})
