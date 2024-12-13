import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'internship_benefits',
    title: 'Internship Benefits',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'blockContent',
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
            title: 'title',
            media: 'logo',
        }
    },
})
