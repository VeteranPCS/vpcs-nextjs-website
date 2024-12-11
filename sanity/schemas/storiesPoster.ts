import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'stories_poster',
    title: 'Stories Poster',
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
            name: 'button_text',
            title: 'Button Text',
            type: 'string',
        }),
        defineField({
            name: 'poster_1',
            title: 'Poster 1',
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
            name: 'poster_2',
            title: 'Poster 2',
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
            media: 'poster_2',
        }
    },
})
