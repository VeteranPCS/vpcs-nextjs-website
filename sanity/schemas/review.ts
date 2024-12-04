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
      validation: (Rule) =>
        Rule.required()
          .min(10)
          .max(500)
          .error("Comment must be between 10 and 500 characters."),
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
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "designation",
      media: "icon", // Optional, if you have an icon or image field
    },
  },
});