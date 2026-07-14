import type { ReactNode } from 'react';

// Class matches the paragraph rendering the bios previously got from
// components/Blog/BlockContent so the cards look identical.
const bioParagraph = 'mb-6 text-gray-700 leading-relaxed';

/**
 * Team bios hand-transcribed from the Sanity `member_info` Portable Text
 * export (content/_data/site/member_info.json), keyed by member `_id`.
 * Scalar fields (name, designation, image, roles) still come from
 * lib/content/about; only the rich bio copy lives here so links, bold, and
 * paragraphs stay freely editable JSX.
 *
 * Editing a bio? lib/content/__tests__/about-bios-parity.test.tsx compares
 * this module's rendered output against the exported JSON; update or retire
 * that check deliberately if the copy is meant to diverge from the export.
 */
export const TEAM_BIOS: Record<string, ReactNode> = {
  // Stephanie Camfield, Chief Creative Officer
  '041a0c49-ae79-47a4-9d74-e8c5651df4fd': (
    <p className={bioParagraph}>
      I am a design enthusiast with a passion for working with companies that have a strong
      purpose and mission. I graduated from Austin Peay State University with a BFA in 2014,
      however, being the wife of a veteran made the start of my career difficult with several
      PCS moves. Thankfully, through hard work and support of my family, I started my own
      freelance design company. I have worked on projects from advertising for environmental
      organizations, to producing materials used for individuals recovering from addiction. I
      am thrilled with the opportunity to assist current families going through the struggles
      of military service and the hassles a PCS move brings.
    </p>
  ),
  // Michelle Bowler, Social Media Strategist
  '25ae4344-896d-439f-8322-8463b231d547': (
    <p className={bioParagraph}>
      I am military spouse, mom, social media strategist and super passionate about sharing
      resources with military families. I graduated from BYU-Idaho in 2015 with a Bachelors in
      Clothing Construction, but having a young family and military life lead to a shift
      towards learning social media marketing and creating resources and content for military
      spouses and families. Throughout the 6 moves in 12 years and soon to be 6 kids, it’s been
      a blessing to be able to work remotely, work with companies that truly care, and serve
      the military community!
    </p>
  ),
  // Jason Anderson, Founder & CEO
  '4ac79db6-8e04-4026-9f74-bf0ba94cec6b': (
    <>
      <p className={bioParagraph}>
        I am a lifelong learner, passionate about my family and friends, the outdoors,
        traveling, adventure, and trying to make a difference in people’s lives. I grew up in
        Minnesota with a dream of flying and serving in the military. In 2012 that dream came
        true and I set off to fly AH-64D Apaches in South Korea, North Carolina, Afghanistan,
        Colorado, and Europe. My experience in the military ignited my deep passion for servant
        leadership. That combined with a mind for entrepreneurship led me into real estate.
        Every aspect of VeteranPCS has been designed with serving others in mind. I am highly
        passionate about this company, our team, and building a business with integrity and
        trust at its core. This is military families helping military families move.
      </p>
      {/* The export ends with a whitespace-only block; kept for structural parity. */}
      <p className={bioParagraph}>{'\n'}</p>
    </>
  ),
  // Harper Foley, Chief Technology Officer
  '77e967ba-ca00-461d-bf88-3d5c88d902db': (
    <p className={bioParagraph}>
      I am an entrepreneurial full-stack engineer driven by a passion for technology, business,
      and serving the veteran community. After an eight-year career as a Navy Explosive
      Ordnance Disposal Officer, I transitioned to technology investment banking where I
      advised C-Suite executives on $3.5 billion of transactions across five mergers and
      acquisitions. I discovered a passion for software development while learning to write
      code to automate repetitive work while in finance and soon left banking to learn to code
      full-time. As the CTO of VeteranPCS, I leverage my deep expertise in developing custom
      software solutions that enhance user experiences and stakeholder communication. Committed
      to delivering secure, impactful services, I use my skills to ensure our operations are
      seamless and help fellow veterans easily navigate the home-buying process.
    </p>
  ),
  // Stephanie Guree, Administrative Manager
  '98453e9f-54dd-483f-b7cd-9af047b10f60': (
    <p className={bioParagraph}>
      I am a wife and mother who chooses daily to see this military life as an adventure. I
      grew up in Georgia and met my husband when we were both in school at the University of
      Georgia. In 2011, I became a military spouse and have been zigzagging across this great
      country of ours since then. I teach our sons at home so that we can get out and explore
      wherever we are planted, and so that we can have a flexible schedule around the military.
      I love to spend time outdoors with my family, whether we are soaking up the sunshine on a
      beach, backpacking in the mountains, or skiing all winter long. As someone who
      understands the PCS process, I am passionate about helping other military families
      navigate this venture.
    </p>
  ),
  // Tara Gould, Administrative Manager
  'b74566ba-d758-4acc-acce-800dc4093461': (
    <p className={bioParagraph}>
      I have worn many hats as a teacher, sound engineer, homeschool mom/coordinator,
      commissary stocker, and Air Force CDC trainer. Most importantly, however, I am a wife and
      mother, and those jobs have taken me far and wide with my husband serving in the Air
      Force since 2010. I enjoy spending time with my husband and teenage sons, who faithfully
      ensure that we are never bored. I enjoy spending time outdoors, at the lake, hiking,
      hunting, fishing, or sometimes watching said activities while reading a good book. I grew
      up in Texas, content to stay put and have a quiet life, but now enjoy the adventure that
      awaits at each new duty station. I understand the struggle of reinventing my career,
      family routine, and putting down roots. Helping others find the start of their next
      chapter or close out the last one with VeteranPCS is an honor.
    </p>
  ),
  // Jessica Brown, Administrative Manager
  'c7530906-a861-4dee-b0bb-5eb9366b9eea': (
    <p className={bioParagraph}>
      I am a entrepreneur with a love and passion for design, developing and growing
      businesses, as well as building relationships. I was lucky enough to experience being a
      military spouse for eight years in the Army and PCSing five times during that time.
      Although, I am a East Coast girl, born and currently residing in Georgia, we spent three
      years stationed in Texas. I am a mother to three beautiful kids, I enjoy running, being
      outdoors and spending time with family. I love helping others and I feel blessed to be a
      part of the VeteranPCS team and their mission in helping other military families during
      their PCS move.
    </p>
  ),
  // Beth Soldner, Chief Administrative Officer
  'f5d054e5-6011-4e04-a564-680fa94c1552': (
    <p className={bioParagraph}>
      I’m a wife, mother, and former teacher with a passion for serving others, baking,
      reading, and spending time with my family. I grew up in Iowa where I met my husband and
      started my journey as a military spouse in 2014. During our first PCS to Hawai’i, I
      finished my Bachelors Degree in Elementary Education from the University of Hawai’i, West
      Oahu in 2017. Since graduating, we have PCS’ed multiple times, which offered me deep
      insight on how difficult it can be to adjust to a new home and job every few years. In
      2021, as our family began to grow, I decided to leave the classroom and begin working
      from home in order to spend more time with my children as they grow. I am so blessed to
      be a part of the VeteranPCS team to assist other military families during the
      transitional times of PCSing.
    </p>
  ),
};

export function getTeamBio(memberId: string): ReactNode {
  return TEAM_BIOS[memberId] ?? null;
}
