'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  captureAnalyticsEvent,
  trackPageviewCounter,
} from '@/lib/analytics/client';
import {
  bucketCount,
  queryMetrics,
  resultBucket,
} from '@/lib/analytics/sanitizer';
import { captureAttributionFromLocation } from '@/lib/analytics/visitor';

export function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttributionFromLocation();
    trackPageviewCounter();
  }, [pathname, searchParams]);

  return null;
}

export function StatePageViewedTracker({
  stateCode,
  stateSlug,
}: {
  stateCode?: string;
  stateSlug: string;
}) {
  useEffect(() => {
    captureAnalyticsEvent('state_page_viewed', {
      state_code: stateCode,
      state_slug: stateSlug,
      source_content_type: 'state_page',
    });
  }, [stateCode, stateSlug]);

  return null;
}

export function ContentViewedTracker({
  contentId,
  contentSlug,
  contentType,
  topicCluster,
  audience,
  pcsStage,
}: {
  contentId?: string;
  contentSlug: string;
  contentType: string;
  topicCluster?: string;
  audience?: string;
  pcsStage?: string;
}) {
  useEffect(() => {
    captureAnalyticsEvent('content_viewed', {
      content_id: contentId,
      content_slug: contentSlug,
      content_type: contentType,
      topic_cluster: topicCluster,
      audience,
      pcs_stage: pcsStage,
      source_content_type: contentType,
    });
  }, [audience, contentId, contentSlug, contentType, pcsStage, topicCluster]);

  return null;
}

// Pure property builders, exported for unit tests. result_count always means
// the TOTAL ranked result count, never the current page slice; `page` records
// which slice the visitor is viewing.
export function blogSearchSubmittedProperties(
  query: string,
  totalResultCount: number,
) {
  const metrics = queryMetrics(query);
  return {
    ...metrics,
    result_count: totalResultCount,
    result_bucket: resultBucket(totalResultCount),
    query_word_count_bucket: bucketCount(metrics.query_word_count),
  };
}

export function blogSearchResultsProperties(
  totalResultCount: number,
  page: number,
) {
  return {
    result_count: totalResultCount,
    result_bucket: resultBucket(totalResultCount),
    page,
  };
}

export function BlogSearchTracker({
  query,
  totalResultCount,
  page,
}: {
  query: string;
  totalResultCount: number;
  page: number;
}) {
  useEffect(() => {
    captureAnalyticsEvent(
      'blog_search_submitted',
      blogSearchSubmittedProperties(query, totalResultCount),
    );
    captureAnalyticsEvent(
      'blog_search_results',
      blogSearchResultsProperties(totalResultCount, page),
    );
  }, [query, totalResultCount, page]);

  return null;
}
