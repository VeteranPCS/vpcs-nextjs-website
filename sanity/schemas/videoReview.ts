import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'video_review',
    title: 'Video Review',
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
        type: 'url', // Store the URL for YouTube embed link
        },
        {
        name: 'description',
        title: 'Description',
        type: 'text',
        },
    ],

    preview: {
        select: {
            title: 'title',
        }
    },
})
