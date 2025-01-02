import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Salesforce Contact Form Parameters',
      type: 'slug',
      description: 'e.g. contact-agent?form=agent&agent=Jason&id=0014x00000HWTqI&state=colorado'
    }),
    defineField({
      name: 'military_status',
      title: 'Military Status and Affiliation',
      type: 'string',
      description: 'e.g. Active Duty Air Force, Army Veteran, Military Spouse, Retired Navy, etc.',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'e.g. San Diego, CA',
    }),
    defineField({
      name: 'brokerage',
      title: 'Brokerage',
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
