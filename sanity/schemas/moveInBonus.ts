import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'moveInBonus',
    title: 'Move-In Bonus',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
      },
      {
        name: 'description',
        title: 'Description',
        type: 'array',
        of: [{ type: 'block' }],
      },
      {
        name: 'bonusTable',
        title: 'Bonus Table',
        type: 'array',
        of: [{
          type: 'object',
          fields: [
            {
              name: 'priceRange',
              title: 'Home Price Range',
              type: 'string',
    
            },
            {
              name: 'moveInBonus',
              title: 'Move-In Bonus',
              type: 'string',
    
            },
            {
              name: 'charityDonation',
              title: 'Charity Donation',
              type: 'string',
    
            }
          ]
        }],
      },
      {
        name: 'requirements',
        title: 'Requirements',
        type: 'array',
        of: [{ type: 'block' }],
      }
    ]
  })