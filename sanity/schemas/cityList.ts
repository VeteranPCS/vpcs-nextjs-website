import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'city_list',
    title: 'City List',
    type: 'document',
    fields: [
        defineField({
            name: 'city_name',
            title: 'City Name',
            type: 'string',
        }),
        defineField({
            name: 'city_slug',
            title: 'City Slug',
            type: 'slug',
            options: {
                source: 'city_name',
                maxLength: 96,
            },
        }),
        defineField({
            name: 'city_map',
            title: 'City Map',
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
            name: 'short_name',
            title: 'Short Name',
            type: 'string',
        }),
    ],
    preview: {
        select: {
            title: 'city_name',
            media: 'city_map',
        },
    },
})
