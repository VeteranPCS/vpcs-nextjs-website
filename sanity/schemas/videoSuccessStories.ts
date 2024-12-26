import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'video_success_stories',
    title: 'Video Success Stories',
    type: 'document',
    fields: [
        {
            name: 'title',
            title: 'Title',
            type: 'string',
        },
        {
            name: 'videoUrl',
            title: 'Video URL',
            type: 'url',
        },
        {
            name: 'description',
            title: 'Description',
            type: 'blockContent',
        },
    ],

    preview: {
        select: {
            title: 'title',
        }
    },
})
