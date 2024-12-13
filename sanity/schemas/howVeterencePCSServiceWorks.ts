import { defineField, defineType } from 'sanity'

// export default defineType({
//     name: 'howVeterencePCSServiceWorks',
//     title: 'How VeteranPCS Service Works',
//     type: 'document',
//     fields: [
//         defineField({
//             name: 'title',
//             title: 'Title',
//             type: 'string'
//         }),
//         defineField({
//             name: 'slug',
//             title: 'Slug',
//             type: 'slug',
//             options: {
//                 source: 'title',
//                 maxLength: 96,
//             },
//         }),
//         defineField({
//             name: 'description',
//             title: 'Description',
//             type: 'blockContent',
//         }),
//     ],
//     preview: {
//         select: {
//             title: 'title',
//         }
//     },
// })

export default defineType({
    name: 'howItWorks',
    title: 'How It Works Page',
    type: 'document',
    fields: [
        {
            name: 'introText',
            title: 'Introduction Text',
            type: 'blockContent',
        },
        {
            name: 'howServiceWorks',
            title: 'How the Service Works',
            type: 'object',
            fields: [
                {
                    name: 'title',
                    title: 'Section Title',
                    type: 'string'
                },
                {
                    name: 'costInfo',
                    title: 'Cost Information',
                    type: 'array',
                    of: [{ type: 'text' }]
                },
                {
                    name: 'connectingWithAgent',
                    title: 'Connecting with Agent',
                    type: 'array',
                    of: [{ type: 'text' }]
                },
                {
                    name: 'interviewAgents',
                    title: 'Interview Agents',
                    type: 'array',
                    of: [{ type: 'text' }]
                },
                {
                    name: 'followUp',
                    title: 'Follow Up',
                    type: 'array',
                    of: [{ type: 'text' }]
                }
            ]
        },
        {
            name: 'moveInBonus',
            title: 'Move-In Bonus',
            type: 'object',
            fields: [
                {
                    name: 'title',
                    title: 'Section Title',
                    type: 'string'
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
                                type: 'string'
                            },
                            {
                                name: 'moveInBonus',
                                title: 'Move-In Bonus Amount',
                                type: 'string'
                            },
                            {
                                name: 'charityDonation',
                                title: 'Charity Donation Amount',
                                type: 'string'
                            }
                        ]
                    }]
                },
                {
                    name: 'requirements',
                    title: 'Requirements',
                    type: 'text'
                }
            ]
        },
        {
            name: 'eligibility',
            title: 'Eligibility',
            type: 'object',
            fields: [
                {
                    name: 'title',
                    title: 'Section Title',
                    type: 'string'
                },
                {
                    name: 'serviceMember',
                    title: 'Service Member Information',
                    type: 'text'
                },
                {
                    name: 'nonServiceMember',
                    title: 'Non-Service Member Information',
                    type: 'text'
                }
            ]
        },
        {
            name: 'agentInformation',
            title: 'Agent Information',
            type: 'object',
            fields: [
                {
                    name: 'title',
                    title: 'Section Title',
                    type: 'string'
                },
                {
                    name: 'disclaimer',
                    title: 'Disclaimer',
                    type: 'text'
                },
                {
                    name: 'qualification',
                    title: 'Qualification Requirements',
                    type: 'array',
                    of: [{ type: 'text' }]
                },
                {
                    name: 'costs',
                    title: 'Cost Information',
                    type: 'array',
                    of: [{ type: 'text' }]
                },
                {
                    name: 'brokerageInfo',
                    title: 'Brokerage Information',
                    type: 'text'
                }
            ]
        },
        {
            name: 'mortgageOfficers',
            title: 'Mortgage Officers Information',
            type: 'object',
            fields: [
                {
                    name: 'title',
                    title: 'Section Title',
                    type: 'string'
                },
                {
                    name: 'disclaimer',
                    title: 'Disclaimer',
                    type: 'text'
                },
                {
                    name: 'qualification',
                    title: 'Qualification Requirements',
                    type: 'array',
                    of: [{ type: 'text' }]
                },
                {
                    name: 'costs',
                    title: 'Cost Information',
                    type: 'text'
                },
                {
                    name: 'companyInfo',
                    title: 'Company Information',
                    type: 'text'
                }
            ]
        },
        {
            name: 'differences',
            title: 'What Makes Us Different',
            type: 'object',
            fields: [
                {
                    name: 'title',
                    title: 'Section Title',
                    type: 'string'
                },
                {
                    name: 'mainText',
                    title: 'Main Description',
                    type: 'text'
                },
                {
                    name: 'reviews',
                    title: 'Reviews Information',
                    type: 'array',
                    of: [{ type: 'text' }]
                },
                {
                    name: 'charities',
                    title: 'Charities Information',
                    type: 'text'
                }
            ]
        },
        {
            name: 'charitiesSupported',
            title: 'Supported Charities',
            type: 'object',
            fields: [
                {
                    name: 'title',
                    title: 'Section Title',
                    type: 'string'
                },
                {
                    name: 'description',
                    title: 'Description',
                    type: 'text'
                }
            ]
        }
    ],
    preview: {
        select: {
            title: 'title',
        }
    },
})