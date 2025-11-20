# VeteranPCS API Documentation

## Overview

VeteranPCS is a NextJS-based web application designed to connect military personnel, veterans, and their families with real estate agents and mortgage lenders during Permanent Change of Station (PCS) moves. The platform integrates with Salesforce for CRM, Sanity for content management, Slack for notifications, OpenPhone for SMS messaging, and Google Business Profile for reviews.

## API Routes

### Endpoint: `/api/v1/areas`

- **HTTP Method**: GET
- **Description**: Retrieves unique geographic areas by state where agents are assigned. Returns sorted list of areas with slugs for routing.
- **Parameters**:
  - **Query Parameters**:
    - `state`: string (required) - Two-letter state abbreviation (e.g., "CA", "TX", "FL")
- **Response**:
  - **200 OK**:

    ```json
    {
      "success": true,
      "data": [
        {
          "name": "San Diego",
          "slug": "san-diego"
        },
        {
          "name": "Los Angeles",
          "slug": "los-angeles"
        }
      ]
    }
    ```

  - **400 Bad Request**: Missing state parameter
  - **500 Internal Server Error**
- **Authentication**: None required
- **Side Effects**: Queries Salesforce for agent area assignments
- **Dynamic**: Route marked as force-dynamic to prevent caching

---

### Endpoint: `/api/v1/bah`

- **HTTP Method**: POST
- **Description**: Calculates Basic Allowance for Housing (BAH) rates by scraping real-time data from defensetravel.dod.mil. Returns BAH amounts with and without dependents for specified rank and location.
- **Parameters**:
  - **Body (JSON)**:
    - `year`: string (required) - Two-digit year code (e.g., "25" for 2025)
    - `zipCode`: string (required) - Five-digit ZIP code (e.g., "98115")
    - `rank`: string (required) - Military pay grade ID (1-24):
      - Enlisted: 1-9 (E-1 through E-9)
      - Warrant: 10-14 (W-1 through W-5)
      - Officer with Prior Enlisted: 15-17 (O1E, O2E, O3E)
      - Officer: 18-24 (O-1 through O-7/O-7+)
- **Response**:
  - **200 OK**:

    ```json
    {
      "success": true,
      "data": {
        "year": "25",
        "zipCode": "98115",
        "rank": "E-5",
        "mha": "Seattle, WA",
        "withDependents": 3051,
        "withoutDependents": 2574,
        "difference": 477,
        "isValid": true
      }
    }
    ```

  - **400 Bad Request**: Missing required fields, invalid ZIP code format, or invalid rank ID
  - **500 Internal Server Error**: Scraping failure or data extraction error
- **Authentication**: None required
- **Side Effects**: Makes external HTTP request to defensetravel.dod.mil
- **Technical Details**:
  - Uses direct POST to `defensetravel.dod.mil/neorates/report/index.php`
  - Parses HTML with Cheerio to extract BAH data from `#ImportDiv2` container
  - Validates extracted amounts to ensure data integrity

---

### Endpoint: `/api/v1/revalidate/salesforce`

- **HTTP Method**: POST
- **Description**: Revalidates cached paths for states associated with a Salesforce account.
- **Parameters**:
  - **Body (JSON)**:
    - `accountId`: string (required) - Salesforce account identifier
  - **Headers**:
    - `X-Salesforce-Signature`: string (required) - Authentication token for webhook verification
- **Response**:
  - **200 OK**:

    ```json
    {
      "status": 200,
      "received": true,
      "now": 1680000000000,
      "accountId": "001xxxxxxxxxxxx"
    }
    ```

  - **400 Bad Request**: Invalid payload
  - **401 Unauthorized**: Invalid signature
  - **404 Not Found**: No states found for the agent
  - **500 Internal Server Error**
- **Authentication**: Requires Salesforce webhook secret in header
- **Side Effects**: Revalidates Next.js cached paths for all states associated with the agent

---

### Endpoint: `/api/v1/revalidate/sanity`

- **HTTP Method**: POST
- **Description**: Revalidates cached paths based on content type changes in Sanity CMS.
- **Parameters**:
  - **Body (JSON)**: Sanity webhook payload containing:
    - `_type`: string (required) - Content type identifier
    - `slug?`: `{ _type: "slug", current: string }` - Content slug
    - `state_slug?`: `{ _type: "slug", current: string }` - State slug
    - `salesforceID?`: string - Salesforce ID for agent/lender
    - `author?`: `{ _type: "reference", _ref: string }` - Author reference
    - `_id`: string - Content ID
- **Response**:
  - **200 OK**:

    ```json
    {
      "status": 200,
      "revalidated": true,
      "now": 1680000000000,
      "body": { /* Original request body */ }
    }
    ```

  - **400 Bad Request**: Missing `_type` or invalid type
  - **401 Unauthorized**: Invalid signature
  - **500 Internal Server Error**
- **Authentication**: Requires Sanity webhook secret for verification
- **Side Effects**: Revalidates relevant Next.js cached paths based on content type

---

### Server Action: `sendOpenPhoneMessage`

- **Description**: Sends SMS messages via OpenPhone API with state-based routing.
- **Parameters**:
  - `content`: string - Message content
  - `from`: string - Sender phone number (automatically routed based on state)
  - `to`: string[] - Array of recipient phone numbers
- **Response**: OpenPhone API response data
- **Authentication**: Requires OpenPhone API key
- **Side Effects**: Sends SMS messages to recipients
- **State Routing**: Automatically selects admin phone number based on agent/lender state

---

### Service: `stateRoutingService`

- **Description**: Routes OpenPhone messages to appropriate admin phone numbers based on state.
- **Admin Assignments**:
  - **Beth (719-249-5359)**: Alaska, Arizona, California, Colorado, Hawaii, Idaho, Iowa, Kansas, Missouri, Montana, Nebraska, Nevada, New Mexico, North Dakota, Oregon, South Dakota, Utah, Washington, Wyoming
  - **Stephanie (719-249-4757)**: Connecticut, Delaware, Illinois, Indiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, New Hampshire, New Jersey, New York, Ohio, Pennsylvania, Rhode Island, Vermont, Virginia, Washington D.C., West Virginia, Wisconsin
  - **Jessica (719-782-5065)**: Alabama, Florida, Georgia, North Carolina, South Carolina
  - **Tara (719-249-7898)**: Arkansas, Kentucky, Louisiana, Mississippi, Oklahoma, Tennessee, Texas
- **Functions**:
  - `getAdminContactForState(state)`: Returns admin contact info for a state
  - `getAdminPhoneNumberForState(state)`: Returns admin phone number for a state
  - `getStatesByAdmin(adminKey)`: Returns all states managed by an admin
- **Fallback**: Uses `OPEN_PHONE_FROM_NUMBER` for unmapped or missing states

---

### Server Action: `sendToSlack`

- **Description**: Sends notifications to Slack with formatted message blocks.
- **Parameters**:
  - `headerText`: string - Header for the Slack message
  - `name`: string - User's name
  - `email`: string - User's email
  - `phoneNumber`: string - User's phone
  - `message`: string - User's message content
  - `agentInfo?`: object - Optional agent details:
    - `name`: string - Agent name
    - `email`: string - Agent email
    - `phoneNumber`: string - Agent phone
    - `brokerage?`: string - Agent's brokerage
    - `state?`: string - Agent's state
- **Response**:
  - Success:

    ```json
    { "ok": true }
    ```

  - Error:

    ```json
    { "ok": false, "error": "Error message" }
    ```

- **Authentication**: Uses Slack webhook URL
- **Side Effects**: Sends formatted notification to Slack channel

## Functions

### Function: `fetchWithRetry`

- **Description**: Performs HTTP requests with automatic retry and timeout handling.
- **Parameters**:
  - `url`: string - The URL to fetch
  - `options`: RequestInit - Fetch options (method, headers, body)
  - `retries`: number (default: 3) - Number of retry attempts
  - `delay`: number (default: 1000) - Initial delay in milliseconds
- **Return Value**: Promise - Response from fetch
- **Side Effects**: None
- **Exceptions/Errors**:
  - Throws "Max retries reached" after all retries fail
  - Throws "HTTP error" for non-200 responses
  - Throws "AbortError" when request times out (30s)

---

### Function: `formatPhoneNumberForDisplay`

- **Description**: Formats a phone number for human-readable display.
- **Parameters**:
  - `phoneNumber`: string - Raw phone number
- **Return Value**: string - Phone number in format (XXX) XXX-XXXX
- **Side Effects**: None
- **Exceptions/Errors**: None

---

### Function: `formatPhoneNumberE164`

- **Description**: Formats a phone number according to E.164 international standard.
- **Parameters**:
  - `phoneNumber`: string - Raw phone number
- **Return Value**: string - Phone number in format +1XXXXXXXXXX
- **Side Effects**: None
- **Exceptions/Errors**: None

---

### Function: `generateOGImage`

- **Description**: Generates social media Open Graph images.
- **Parameters**:
  - `title?`: string (default: 'VeteranPCS') - Title text
  - `image_url?`: string (default: '/assets/blogctabgimage.png') - Background image URL
  - `logo_url?`: string (default: '/assets/blogctabgimage.png') - Logo image URL
- **Return Value**: Promise - Next.js Image Response
- **Side Effects**: None
- **Exceptions/Errors**: May throw if font fails to load

---

### Function: `orderMilitaryServiceInfo`

- **Description**: Formats military service information in a specific order.
- **Parameters**:
  - `status`: string - Military status (e.g., "Active", "Veteran")
  - `service`: string - Military branch (e.g., "Army", "Navy")
- **Return Value**: string - Formatted military service string
- **Side Effects**: None
- **Exceptions/Errors**: None

---

### Function: `fetchGoogleReviews`

- **Description**: Retrieves business reviews from Google Business Profile.
- **Parameters**: None
- **Return Value**: Promise - Object containing reviews array, average rating, and total count
- **Side Effects**: Authenticates with Google API
- **Exceptions/Errors**:
  - Falls back to local JSON data if API request fails
  - Logs errors to console

---

### Function: `formatDate`

- **Description**: Formats timestamp into MM.DD.YYYY format.
- **Parameters**:
  - `timestamp`: string - ISO date string
- **Return Value**: string - Formatted date (MM.DD.YYYY)
- **Side Effects**: None
- **Exceptions/Errors**: May throw if timestamp is invalid

---

### Function: `verifySalesforceSignature`

- **Description**: Verifies Salesforce webhook signature for security.
- **Parameters**:
  - `req`: NextRequest - Next.js request object
- **Return Value**: boolean - True if signature valid, false otherwise
- **Side Effects**: None
- **Exceptions/Errors**: None

---

### Function: `convertStateNameToPathName`

- **Description**: Converts state name to URL-safe path segment.
- **Parameters**:
  - `state`: string - US state name
- **Return Value**: string - Lowercase, hyphenated path
- **Side Effects**: None
- **Exceptions/Errors**: None

---

### Salesforce Token Services

#### Function: `getSalesforceToken`

- **Description**: Retrieves/refreshes Salesforce authentication token.
- **Parameters**: None
- **Return Value**: Promise - Valid token
- **Side Effects**: May refresh token if expired
- **Exceptions/Errors**: Throws if unable to authenticate

#### Function: `getGoogleAuthToken`

- **Description**: Retrieves/refreshes Google authentication token.
- **Parameters**: None
- **Return Value**: Promise - Valid token
- **Side Effects**: May refresh token if expired
- **Exceptions/Errors**: Throws if unable to authenticate

---

### Blog Services

#### Function: `fetchBlogs`

- **Description**: Retrieves all blog posts from Sanity CMS.
- **Parameters**: None
- **Return Value**: Promise<Array> - Array of blog posts
- **Side Effects**: None
- **Exceptions/Errors**: Returns empty array on error

#### Function: `fetchBlog`

- **Description**: Retrieves single blog post by slug.
- **Parameters**:
  - `slug`: string - Blog post URL slug
- **Return Value**: Promise<Blog | null> - Blog post or null if not found
- **Side Effects**: None
- **Exceptions/Errors**: Returns null on error

#### Function: `SearchBlog`

- **Description**: Searches blog content by query.
- **Parameters**:
  - `query`: string - Search query
- **Return Value**: Promise<Array> - Matching blog posts
- **Side Effects**: None
- **Exceptions/Errors**: Returns empty array on error

#### Function: `fetchBlogsByAuthor`

- **Description**: Retrieves blogs written by specific author.
- **Parameters**:
  - `authorId`: string - Author ID
- **Return Value**: Promise<Array> - Author's blog posts
- **Side Effects**: None
- **Exceptions/Errors**: Returns empty array on error

---

### Client Area Services

#### Function: `fetchAreasByState`

- **Description**: Retrieves geographic areas for a specific state from the areas API.
- **Parameters**:
  - `stateCode`: string - Two-letter state abbreviation
- **Return Value**: Promise<Array> - Array of area assignments with name and slug
- **Side Effects**: Makes client-side fetch request to `/api/v1/areas`
- **Exceptions/Errors**: Throws error if request fails or API returns error

---

### Agent Services

#### Function: `fetchLogosList`

- **Description**: Retrieves real estate agent logos.
- **Parameters**: None
- **Return Value**: Promise<Array> - Agent logos
- **Side Effects**: None
- **Exceptions/Errors**: Returns empty array on error

#### Function: `getAgentImage`

- **Description**: Retrieves agent's profile image.
- **Parameters**:
  - `id`: string - Salesforce agent ID
- **Return Value**: Promise<string | null> - Image URL or null
- **Side Effects**: None
- **Exceptions/Errors**: Returns null on error

#### Function: `getAgentState`

- **Description**: Retrieves states an agent is licensed in.
- **Parameters**:
  - `id`: string - Salesforce agent ID
- **Return Value**: Promise<Array> - List of state names
- **Side Effects**: None
- **Exceptions/Errors**: Returns empty array on error

---

### Form Submission Services

#### Function: `contactAgentPostForm`

- **Description**: Submits contact agent form to Salesforce.
- **Parameters**: FormData object
- **Return Value**: Promise - API response
- **Side Effects**: Creates Salesforce lead, sends notifications
- **Exceptions/Errors**: Returns error response on failure

#### Function: `GetListedAgentsPostForm`

- **Description**: Submits agent listing request.
- **Parameters**: FormData object
- **Return Value**: Promise - API response
- **Side Effects**: Creates Salesforce record, sends notifications
- **Exceptions/Errors**: Returns error response on failure

#### Function: `contactLenderPostForm`

- **Description**: Submits mortgage lender contact form.
- **Parameters**: FormData object
- **Return Value**: Promise - API response
- **Side Effects**: Creates Salesforce lead, sends notifications
- **Exceptions/Errors**: Returns error response on failure

---

### BAH Calculator Component

#### Component: `BAHCalculator`

- **Description**: Client-side React component for calculating Basic Allowance for Housing (BAH) rates.
- **Features**:
  - Auto-submit on field completion with debouncing (500ms)
  - Real-time BAH calculations via `/api/v1/bah` endpoint
  - Currency formatting with commas ($X,XXX.XX)
  - Dependent/non-dependent toggle
  - Google Tag Manager integration for analytics
  - Loading states and error handling
- **User Inputs**:
  - ZIP Code: 5-digit numeric input
  - Year: Dropdown (defaults to current year)
  - Rank: Military pay grade selection (E-1 through O-7+)
  - Dependents: Toggle button for with/without dependents
- **Display**:
  - Monthly BAH allowance
  - Yearly BAH allowance (monthly × 12)
  - Military Housing Area (MHA)
  - Automatic calculation on form completion
- **Side Effects**:
  - Sends GTM events on successful calculations
  - Makes API calls to `/api/v1/bah`
- **Technical Details**:
  - Uses `useRef` to prevent duplicate API calls
  - Implements request deduplication based on zip-rank-year key

---

### BAH Scraper Library

#### Module: `lib/bah-scraper.ts`

- **Description**: Server-side library for extracting BAH data from defensetravel.dod.mil.
- **Key Functions**:
  - `extractBAHData(year, zipCode, rankId)`: Main extraction function
  - `RANK_MAPPING`: Constant mapping of rank IDs to pay grade names
- **Technical Implementation**:
  - Direct POST to `defensetravel.dod.mil/neorates/report/index.php`
  - Uses Node.js native `https` module for requests
  - Parses HTML with Cheerio library
  - Extracts data from `#ImportDiv2` container
  - Validates extracted amounts (with deps > without deps, both > 0)
- **Return Value**:
  - Object containing year, zipCode, rank, mha, withDependents, withoutDependents, difference, isValid
- **Side Effects**: Makes external HTTPS requests
- **Exceptions/Errors**:
  - Throws on invalid rank ID
  - Throws on missing container or table
  - Throws on invalid BAH amounts

---

## Additional Notes

The codebase integrates multiple external services including Salesforce for CRM, Sanity for content management, Slack for notifications, OpenPhone for messaging, and Google for reviews. It employs Next.js cache revalidation strategies to ensure content is fresh while maintaining performance.

### API Versioning

All public API endpoints are versioned under `/api/v1/` to support future iterations without breaking existing integrations. Currently implemented v1 endpoints include:

- BAH calculator (`/api/v1/bah`)
- Geographic areas lookup (`/api/v1/areas`)
- Cache revalidation webhooks (`/api/v1/revalidate/salesforce`, `/api/v1/revalidate/sanity`)
