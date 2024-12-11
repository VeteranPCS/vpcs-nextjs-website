import { defineField, defineType } from "sanity";

export default defineType({
  name: "review",
  title: "Review",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required().error("Name is required."),
    }),
    defineField({
      name: "designation",
      title: "Designation",
      type: "string",
      validation: (Rule) =>
        Rule.required().error("Designation is required."),
    }),
    defineField({
      name: "comment",
      title: "Comment",
      type: "text",
    }),
    defineField({
      name: "ratings",
      title: "Ratings",
      type: "number",
      validation: (Rule) =>
        Rule.required()
          .min(0)
          .max(5)
          .error("Ratings must be a number between 0 and 5."),
    }),
    defineField({
      name: 'user_logo',
      title: 'User Logo',
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
      title: "name",
      subtitle: "designation",
      media: "user_logo",
    },
  },
});