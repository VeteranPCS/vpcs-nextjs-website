import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'member_info',
    title: 'Members Information',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
        }),
        defineField({
            name: "designation",
            title: "Designation",
            type: "string",
        }),
        defineField({
            name: "roles",
            title: "Roles",
            type: "string",
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
        defineField({
            name: 'description',
            title: 'Description',
            type: 'array',
            of: [
                {
                    title: 'Block',
                    type: 'block',
                    styles: [{ title: 'Normal', value: 'normal' }],
                    lists: [],
                },
            ],
        }),
    ],
    preview: {
        select: {
            title: 'name',
            subtitle: "designation",
            media: 'image',
        },
    },
})
