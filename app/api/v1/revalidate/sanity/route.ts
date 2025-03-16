import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";
import agentService from "@/services/agentService";
import blogService from "@/services/blogService";

type RevalidatePathMap = {
  [key: string]: string[];
};

export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{
      _type: string;
      slug?: {
        _type: "slug";
        current: string;
      };
      state_slug?: {
        _type: "slug";
        current: string;
      };
      salesforceID?: string;
      author?: {
        _type: "reference";
        _ref: string;
      };
      _id: string;
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
    const state_slug = body.state_slug?.current || "";
    const revalidatePathMap: RevalidatePathMap = {
      aboutSupportComponent: ["/about", "/spanish"],
      aboutUsPage: ["/about", "/spanish"],
      additionalSuccessStories: ["/stories"],
      approved_company_list: ["/military-spouse"],
      author: ["/pcs-resources", "/thank-you", "/blog"],
      blog: ["/blog", `/blog/${slug}`, "/pcs-resources", "/thank-you"],
      category: ["/blog", `/blog/${slug}`, "/pcs-resources", "/thank-you"],
      state_list: ["/contact-agent", "/get-listed-agents", "/get-listed-lenders", `/${state_slug}`],
      frequently_asked_questions: [`/${state_slug}`, "/about", `/blog/${slug}`, "/impact", "/internship", "/military-spouse", "/pcs-resources", "/stories"],
      how_veterence_pcs_works: ["/how-it-works"],
      impact_page: ["/impact", "/military-spouse", "/pcs-resources", "/thank-you"],
      internship_action: ["/internship"],
      internship_benefits: ["/internship"],
      internship_offer: ["/internship"],
      life_resources: ["/pcs-resources"],
      media_account: ["/contact", "/", `/${state_slug}`, "/about", "/blog", `/blog/${slug}`, "/contact", "/how-it-works", "/impact", "/internship", "/military-spouse", "/pcs-resources", "/stories", "/thank-you", "/spanish"],
      member_info: ["/about"],
      military_spouse_approved: ["/military-spouse"],
      military_spouse_employment: ["/military-spouse"],
      moveInBonus: ["/how-it-works"],
      moving_your_life: ["/military-spouse"],
      real_state_agents: ["/"],
      review: ["/", "/contact", "/impact", "/military-spouse", "/pcs-resources", "/stories"],
      stories_poster: ["/impact"],
      support_veterence: ["/", "/impact", "/pcs-resources", "/spanish", "/stories"],
      trusted_resources: ["/military-spouse", "/pcs-resources"],
      users: ["/", `/blog/${slug}`, "/impact", "/military-spouse", "/pcs-resources", "/stories", "/spanish", "/thank-you"],
      video_review: ["/impact", "/military-spouse", "/pcs-resources", "/thank-you"],
      video_success_stories: ["/stories"],
      veterence_logo: ["/blog", `/blog/${slug}`, "/pcs-resources", "/thank-you"],
    };

    let paths;
    switch (body._type) {
      case "agent":
        paths = await agentService.getAgentState(body.salesforceID!);
        break;
      case "author":
        const blogs = await blogService.fetchBlogsByAuthor(body._id);
        paths = blogs.map((blog: any) => `/blog/${blog.slug}`);
        break;
      default:
        paths = revalidatePathMap[body._type];
    }

    if (!paths) {
      return new Response(JSON.stringify({ message: "Invalid Type" }), {
        status: 400,
      });
    } else {
      console.log(`Revalidating type: ${body._type}`);
      for (const path of paths) {
        console.log(`Revalidating path: ${path}`);
        revalidatePath(path);
        console.log(`Revalidated path: ${path}`);
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