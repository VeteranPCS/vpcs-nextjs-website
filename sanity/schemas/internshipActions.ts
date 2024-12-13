import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'internship_action',
    title: 'Internship Action',
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
            type: 'text',
        }),
        defineField({
            name: 'action_image',
            title: 'Action Image',
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
            media: 'action_image',
        }
    },
})
