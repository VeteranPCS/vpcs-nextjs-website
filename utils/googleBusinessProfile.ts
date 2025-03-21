// lib/googleBusinessProfile.js

import { JWT } from 'google-auth-library';
import { Review } from '@/components/homepage/ReviewTestimonial/ReviewTestimonial'

const LOCATION_ID = process.env.LOCATION_ID;

export async function fetchGoogleReviews() {
    try {
        const serviceAccountJson = JSON.parse(
            Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS as string, 'base64').toString('utf-8')
        );

        const auth = new JWT({
            email: serviceAccountJson.client_email,
            key: serviceAccountJson.private_key,
            scopes: ['https://www.googleapis.com/auth/business.manage'],
            subject: serviceAccountJson.client_email
        });
        console.log("auth: ", auth);

        await auth.authorize();

        const accountId = process.env.GOOGLE_REVIEWS_ACCOUNT_ID;
        console.log('Using Account ID:', accountId);
        console.log('Using Location ID:', LOCATION_ID);

        const response = await fetch(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${LOCATION_ID}/reviews`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${auth.credentials.access_token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            console.error('Request URL:', response.url);
            console.error('Request Headers:', response.headers);
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data?.reviews as Review[] || [];
    } catch (error) {
        console.error('Error fetching Google Reviews:', error);
        return [];
    }
}