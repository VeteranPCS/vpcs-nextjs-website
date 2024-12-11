import { type SchemaTypeDefinition } from 'sanity'

import blockContent from './schemas/blockContent'
import category from './schemas/category'
import post from './schemas/post'
import author from './schemas/author'
import userImage from './schemas/userImage'
import review from './schemas/review'
import realStateAgents from './schemas/realStateAgents'
import blog from './schemas/blog'
import mediaAccounts from './schemas/mediaAccounts'
import memberInfo from './schemas/memberInfo'
import frequentlyAskedQuestions from './schemas/frequentlyAskedQuestions'
import aboutUsPage from './schemas/aboutUsPage'
import aboutSupport from './schemas/aboutSupport'
import supportVeterence from './schemas/supportVeterence'
import storiesPoster from './schemas/storiesPoster'
import videoReview from './schemas/videoReview'
import impactPage from './schemas/impactPage'
import additionalSuccessStories from './schemas/additionalSuccessStories'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    post,
    author,
    category,
    blockContent,
    userImage, 
    review, 
    realStateAgents, 
    blog, 
    mediaAccounts, 
    memberInfo, 
    frequentlyAskedQuestions, 
    aboutUsPage, 
    aboutSupport, 
    supportVeterence,
    storiesPoster,
    videoReview,
    impactPage,
    additionalSuccessStories
  ],
}
