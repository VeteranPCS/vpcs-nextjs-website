import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

type RevalidatePathMap = {
  [key: string]: string[];
};

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{
      _type: string;
      slug?: {
        _type: "slug";
        current: string;
      };
      city_slug?: {
        _type: "slug";
        current: string;
      };
    }>(req, process.env.SANITY_REVALIDATE_KEY);

    if (!isValidSignature) {
      const message = "Invalid signature";
      return new Response(JSON.stringify({ message, isValidSignature, body }), {
        status: 401,
      });
    }

    if (!body?._type) {
      return new Response(JSON.stringify({ message: "Bad Request" }), {
        status: 400,
      });
    }

    const slug = body.slug?.current || "";
    const city_slug = body.city_slug?.current || "";
    const revalidatePathMap: RevalidatePathMap = {
      aboutSupportComponent: ["/about", "/spanish"],
      aboutUsPage: ["/about", "/spanish"],
      additionalSuccessStories: ["stories"],
      approved_company_list: ["/militaryspouse"],
      author: ["/pcs-resources", "/thank-you", "blog", `/blog/${slug}`],
      blog: ["/blog", `/blog/${slug}`, "/pcs-resources", "/thank-you"],
      category: ["/blog", `/blog/${slug}`, "/pcs-resources", "/thank-you"],
      city_list: ["/contact-agent", "/get-listed-agents", "/get-listed-lenders", `/${city_slug}`],
      frequently_asked_questions: [`/${city_slug}`, "/about", `/blog/${slug}`, "/impact", "/internship", "/militaryspouse", "/pcs-resources", "/stories"],
      how_veterence_pcs_works: ["/how-it-works"],
      impact_page: ["/impact", "/militaryspouse", "pcs-resources", "/thank-you"],
      internship_action: ["/internship"],
      internship_benefits: ["/internship"],
      internship_offer: ["/internship"],
      life_resources: ["/pcs-resources"],
      media_account: ["/contact", "/", `/${city_slug}`, "/about", "/blog", `/blog/${slug}`, "/contact", "/how-it-works", "/impact", "/internship", "militaryspouse", "/pcs-resources", "/stories", "/thank-you", "/spanish"],
      member_info: ["/about"],
      military_spouse_approved: ["/militaryspouse"],
      military_spouse_employment: ["/militaryspouse"],
      moveInBonus: ["/how-it-works"],
      moving_your_life: ["/militaryspouse"],
      real_state_agents: ["/"],
      review: ["/", "/contact", "/impact", "/militaryspouse", "/pcs-resources", "/stories"],
      stories_poster: ["/impact"],
      support_veterence: ["/", "/impact", "/pcs-resources", "spanish", "stories"],
      trusted_resources: ["/militaryspouse", "/pcs-resources"],
      users: ["/", `/blog/${slug}`, "/impact", "/militaryspouse", "/pcs-resources", "/stories", "/spanish", "/thank-you"],
      video_review: ["/impact", "/militaryspouse", "/pcs-resources", "/thank-you"],
      video_success_stories: ["/stories"],
      veterence_logo: ["/blog", `/blog/${slug}`, "/pcs-resources", "/thank-you"]
    };
    const paths = revalidatePathMap[body._type];

    if (!paths) {
      return new Response(JSON.stringify({ message: "Invalid Type" }), {
        status: 400,
      });
    } else {
      for (const path of paths) {
        revalidatePath(path);
      }
    }

    return NextResponse.json({
      status: 200,
      revalidated: true,
      now: Date.now(),
      body,
    });
  } catch (err: any) {
    console.error(err);
    if (err instanceof Error) {
      return new Response(err.message, { status: 500 });
    }
    return new Response("Error", { status: 500 });
  }
}