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

export function BlogSearchTracker({
  query,
  resultCount,
}: {
  query: string;
  resultCount: number;
}) {
  useEffect(() => {
    const metrics = queryMetrics(query);
    captureAnalyticsEvent('blog_search_submitted', {
      ...metrics,
      result_count: resultCount,
      result_bucket: resultBucket(resultCount),
      query_word_count_bucket: bucketCount(metrics.query_word_count),
    });
    captureAnalyticsEvent('blog_search_results', {
      result_count: resultCount,
      result_bucket: resultBucket(resultCount),
    });
  }, [query, resultCount]);

  return null;
}
