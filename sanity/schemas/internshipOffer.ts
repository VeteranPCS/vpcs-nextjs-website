import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'internship_offer',
    title: 'Internship Offer',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
        }),
        defineField({
            name: 'details',
            title: 'Details',
            type: 'text',
        }),
        defineField({
            name: 'button_text',
            title: 'Button Text',
            type: 'string',
        })
    ],
    preview: {
        select: {
            title: 'title'
        }
    },
})
