import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'agent',
    title: 'Agents',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
        }),
        defineField({
            name: 'firstName',
            title: 'First Name',
            type: 'string',
        }),
        defineField({
            name: 'lastName',
            title: 'last Name',
            type: 'string',
        }),
        defineField({
            name: 'salesforceID',
            title: 'Salesforce ID',
            type: 'string',
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
            title: 'name',
            media: 'image',
        },
    },
})
