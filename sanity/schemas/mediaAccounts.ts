import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'media_account',
    title: 'Medit Account',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
        }),
        defineField({
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            options: {
                source: 'name',
                maxLength: 96,
            },
        }),
        defineField({
            name: 'icon',
            title: 'Icon',
            type: 'string',
        }),
        defineField({
            name: 'link',
            title: 'Link',
            type: 'url',
        }),
    ],
    preview: {
        select: {
            title: 'name'
        },
    },
})
