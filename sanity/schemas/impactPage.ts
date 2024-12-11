import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'impact_page',
    title: 'Impact Page',
    type: 'document',
    fields: [
        defineField({
            name: 'componentName',
            title: 'Component Name',
            type: 'string'
        }),
        defineField({
            name: 'header',
            title: 'Header',
            type: 'string',
        }),
        defineField({
            name: 'buttonText',
            title: 'Button Text',
            type: 'string',
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'blockContent',
        }),
        defineField({
            name: 'foreground_image',
            title: 'Foreground image',
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
            title: 'componentName',
            media: 'foreground_image',
        }
    },
})
