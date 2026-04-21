import { JWT } from 'google-auth-library';
import { Review } from '@/components/homepage/ReviewTestimonial/ReviewTestimonial'
import fallBackReviews from '@/public/json/reviews.json';

const LOCATION_ID = process.env.GOOGLE_REVIEWS_LOCATION_ID;
const ACCOUNT_ID = process.env.GOOGLE_REVIEWS_ACCOUNT_ID;
const SUBJECT = process.env.GOOGLE_SERVICE_ACCOUNT_SUBJECT;
const CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;

let cachedJWT: JWT | null = null;

function getAuthClient(): JWT {
    if (!cachedJWT) {
        const serviceAccountJson = JSON.parse(
            Buffer.from(CREDENTIALS as string, 'base64').toString('utf-8')
        );
        cachedJWT = new JWT({
            email: serviceAccountJson.client_email,
            key: serviceAccountJson.private_key,
            scopes: ['https://www.googleapis.com/auth/business.manage'],
            subject: SUBJECT,
        });
    }
    return cachedJWT;
}

// First, let's create an interface for the API response
interface GoogleReviewsResponse {
    reviews: Review[];
    averageRating: number;
    totalReviewCount: number;
}

// Update the fallback reviews type
interface ReviewsData {
    reviews: Review[];
    averageRating: number;
    totalReviewCount: number;
}

/**
 * Fetches Google Business Profile reviews using JWT service account authentication.
 * 
 * This function is designed to work during Next.js build time and uses server-to-server
 * authentication with a Google service account. It never fails - if the API is unavailable
 * or credentials are missing, it returns fallback reviews from the static JSON file.
 * 
 * @returns Promise<ReviewsData> - Always returns valid review data (from API or fallback)
 * 
 * @example
 * ```typescript
 * export default async function ReviewsPage() {
 *   const { reviews, averageRating, totalReviewCount } = await fetchGoogleReviews();
 *   return <div>...</div>;
 * }
 * ```
 * 
 * @requires Environment Variables:
 * - GOOGLE_SERVICE_ACCOUNT_CREDENTIALS: Base64-encoded service account JSON
 * - GOOGLE_REVIEWS_ACCOUNT_ID: Google Business Profile account ID
 * - LOCATION_ID: Google Business Profile location ID
 * 
 * @see GOOGLE_REVIEWS_SETUP.md for detailed setup instructions
 */
export async function fetchGoogleReviews(): Promise<ReviewsData> {
    // If credentials are not configured, return fallback immediately
    if (!CREDENTIALS || !LOCATION_ID || !ACCOUNT_ID || !SUBJECT) {
        console.warn('Google Business Profile API credentials not configured. Using fallback reviews.');
        return fallBackReviews as ReviewsData;
    }

    try {
        const auth = getAuthClient();
        await auth.authorize();

        // Use the Google My Business API v4 for reviews
        // Format: accounts/{accountId}/locations/{locationId}/reviews
        const response = await fetch(
            `https://mybusiness.googleapis.com/v4/accounts/${ACCOUNT_ID}/locations/${LOCATION_ID}/reviews`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${auth.credentials.access_token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                // Next.js 14: Use next-specific caching instead of cache: 'no-store'
                // This tells Next.js to revalidate on each request without causing build errors
                next: { revalidate: 0 }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google Business Profile API Error:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                error: errorText
            });

            // If API fails, return fallback
            console.warn('Using fallback reviews due to API error');
            return fallBackReviews as ReviewsData;
        }

        const data = await response.json();

        // Validate response data structure
        if (!data || !Array.isArray(data.reviews)) {
            console.warn('Invalid response structure from Google Business Profile API. Using fallback.');
            return fallBackReviews as ReviewsData;
        }

        return {
            reviews: data.reviews || fallBackReviews.reviews,
            averageRating: data.averageRating || fallBackReviews.averageRating,
            totalReviewCount: data.totalReviewCount || fallBackReviews.totalReviewCount
        };
    } catch (error: any) {
        // Re-throw Next.js control-flow errors (DYNAMIC_SERVER_USAGE, NEXT_REDIRECT,
        // NEXT_NOT_FOUND) so the framework can mark the route dynamic. Swallowing
        // them forces fallback data into a dynamic route and floods build logs.
        if (error?.digest) {
            throw error;
        }
        console.error('Error fetching Google Reviews:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
        }
        return fallBackReviews as ReviewsData;
    }
}