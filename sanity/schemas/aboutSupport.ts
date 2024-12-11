import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'aboutSupportComponent',
    title: 'About Support Component',
    type: 'document',
    fields: [
        defineField({
            name: 'header_1',
            title: 'Header 1',
            type: 'string',
        }),
        defineField({
            name: 'header_2',
            title: 'Header 2',
            type: 'string',
        }),
        defineField({
            name: 'buttonText_1',
            title: 'Button Text 1',
            type: 'string',
        }),
        defineField({
            name: 'buttonText_2',
            title: 'Button Text 2',
            type: 'string',
        }),
        defineField({
            name: 'description_1',
            title: 'Description 1',
            type: 'text',
        }),
        defineField({
            name: 'description_2',
            title: 'Description 2',
            type: 'text',
        }),
        defineField({
            name: 'image',
            title: 'image',
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
          media: 'image',
        }
      },
})
