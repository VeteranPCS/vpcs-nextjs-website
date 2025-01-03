import { type SchemaTypeDefinition } from 'sanity'

import blockContent from '@/sanity/schemas/blockContent'
import category from '@/sanity/schemas/category'
import author from '@/sanity/schemas/author'
import userImage from '@/sanity/schemas/userImage'
import review from '@/sanity/schemas/review'
import realStateAgents from '@/sanity/schemas/realStateAgents'
import blog from '@/sanity/schemas/blog'
import mediaAccounts from '@/sanity/schemas/mediaAccounts'
import memberInfo from '@/sanity/schemas/memberInfo'
import frequentlyAskedQuestions from '@/sanity/schemas/frequentlyAskedQuestions'
import aboutUsPage from '@/sanity/schemas/aboutUsPage'
import aboutSupport from '@/sanity/schemas/aboutSupport'
import supportVeterence from '@/sanity/schemas/supportVeterence'
import storiesPoster from '@/sanity/schemas/storiesPoster'
import videoReview from '@/sanity/schemas/videoReview'
import impactPage from '@/sanity/schemas/impactPage'
import additionalSuccessStories from '@/sanity/schemas/additionalSuccessStories'
import internshipActions from '@/sanity/schemas/internshipActions'
import internshipBenefits from '@/sanity/schemas/internshipBenefits'
import internshipOffer from '@/sanity/schemas/internshipOffer'
import lifeResources from '@/sanity/schemas/lifeResources'
import trustedResources from '@/sanity/schemas/trustedResources'
import militarySpouseEmployment from '@/sanity/schemas/militarySpouseEmployment'
import movingYourLife from '@/sanity/schemas/movingYourLife'
import militarySpouseApproved from '@/sanity/schemas/militarySpouseApproved'
import approvedCompanyList from '@/sanity/schemas/approvedCompanyList'
import howVeterencePCSWorks from '@/sanity/schemas/howVeterencePCSWorks'
import moveInBonus from '@/sanity/schemas/moveInBonus'
import cityList from '@/sanity/schemas/cityList'
import videoSuccessStories from '@/sanity/schemas/videoSuccessStories'
import veterenceImage from './schemas/veterenceImage' 

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
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
    additionalSuccessStories,
    internshipActions,
    internshipBenefits,
    internshipOffer,
    lifeResources,
    trustedResources,
    militarySpouseEmployment,
    movingYourLife,
    militarySpouseApproved,
    approvedCompanyList,
    howVeterencePCSWorks,
    moveInBonus,
    cityList,
    videoSuccessStories,
    veterenceImage
  ],
}
