import { type SchemaTypeDefinition } from 'sanity'

import blockContent from './schemas/blockContent'
import category from './schemas/category'
import post from './schemas/post'
import author from './schemas/author'
import userImage from './schemas/userImage'
import review from './schemas/review'
import realStateAgents from './schemas/realStateAgents'
import blog from './schemas/blog'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [post, author, category, blockContent, userImage, review, realStateAgents, blog],
}
