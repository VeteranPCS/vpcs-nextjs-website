import { defineMigration, at, setIfMissing, unset } from 'sanity/migrate'

const from = 'city_list'
const to = 'state_list'

export default defineMigration({
  title: 'Replace city list with state list',
  documentTypes: [from],

  migrate: {
    document(doc, context) {
      return [
        // Copy over the content with renamed fields
        at(to, setIfMissing({
          ...doc,
          _type: to,
          state_name: doc.city_name,
          state_slug: doc.city_slug,
          state_map: doc.city_map,
        })),
        // Remove the old document
        at(from, unset())
      ]
    }
  }
})