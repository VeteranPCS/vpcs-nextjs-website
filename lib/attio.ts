// lib/attio.ts

import type {
  ObjectDefinition,
  AttributeDefinition,
  ListDefinition,
  StatusDefinition,
} from './attio-schema';

const ATTIO_API_URL = 'https://api.attio.com/v2';

class AttioClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ATTIO_API_KEY!;
  }

  private async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${ATTIO_API_URL}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Attio API error: ${res.status} ${error}`);
    }

    return res.json();
  }

  // ==========================================================================
  // SCHEMA MANAGEMENT METHODS
  // ==========================================================================

  /**
   * List all objects in the workspace
   */
  async listObjects(): Promise<any[]> {
    const res = await this.request('/objects');
    return res.data;
  }

  /**
   * Get a specific object by slug
   */
  async getObject(slug: string): Promise<any | null> {
    try {
      const res = await this.request(`/objects/${slug}`);
      return res.data;
    } catch (error: any) {
      if (error.message.includes('404')) return null;
      throw error;
    }
  }

  /**
   * Create a new custom object
   */
  async createObject(definition: ObjectDefinition): Promise<any> {
    const res = await this.request('/objects', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          api_slug: definition.api_slug,
          singular_noun: definition.singular_noun,
          plural_noun: definition.plural_noun,
        },
      }),
    });
    return res.data;
  }

  /**
   * Create an attribute on an object
   */
  async createAttribute(objectSlug: string, attribute: AttributeDefinition): Promise<any> {
    // Build config based on attribute type
    let config: Record<string, any> = attribute.config ? { ...attribute.config } : {};

    // Add type-specific default configs if not provided
    if (attribute.type === 'currency' && (!config.currency || !config.currency.default_currency_code)) {
      config.currency = {
        default_currency_code: 'USD',
        display_type: 'symbol',
        ...config.currency,
      };
    }

    const body: any = {
      data: {
        title: attribute.title,
        api_slug: attribute.api_slug,
        type: attribute.type,
        description: attribute.description || attribute.title,  // Default to title if no description
        is_required: attribute.is_required ?? false,
        is_unique: attribute.is_unique ?? false,
        is_multiselect: attribute.is_multiselect ?? false,
        config: config,
      },
    };

    const res = await this.request(`/objects/${objectSlug}/attributes`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.data;
  }

  /**
   * List all lists (pipelines) in the workspace
   */
  async listLists(): Promise<any[]> {
    const res = await this.request('/lists');
    return res.data;
  }

  /**
   * Get a specific list by slug
   */
  async getList(slug: string): Promise<any | null> {
    try {
      const res = await this.request(`/lists/${slug}`);
      return res.data;
    } catch (error: any) {
      if (error.message.includes('404')) return null;
      throw error;
    }
  }

  /**
   * Create a new list (pipeline)
   */
  async createList(definition: ListDefinition): Promise<any> {
    const res = await this.request('/lists', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          name: definition.name,
          api_slug: definition.api_slug,
          parent_object: definition.parent_object,
          workspace_access: 'full-access',
          workspace_member_access: [],
        },
      }),
    });
    return res.data;
  }

  /**
   * Create an attribute on a list
   */
  async createListAttribute(listSlug: string, attribute: AttributeDefinition): Promise<any> {
    // Build config based on attribute type
    let config: Record<string, any> = attribute.config ? { ...attribute.config } : {};

    // Add type-specific default configs if not provided
    if (attribute.type === 'currency' && (!config.currency || !config.currency.default_currency_code)) {
      config.currency = {
        default_currency_code: 'USD',
        display_type: 'symbol',
        ...config.currency,
      };
    }

    const body: any = {
      data: {
        title: attribute.title,
        api_slug: attribute.api_slug,
        type: attribute.type,
        description: attribute.description || attribute.title,  // Default to title if no description
        is_required: attribute.is_required ?? false,
        is_unique: attribute.is_unique ?? false,
        is_multiselect: attribute.is_multiselect ?? false,
        config: config,
      },
    };

    const res = await this.request(`/lists/${listSlug}/attributes`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.data;
  }

  /**
   * Create a status (stage) on a list
   */
  async createListStatus(listSlug: string, status: StatusDefinition): Promise<any> {
    const res = await this.request(`/lists/${listSlug}/statuses`, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          title: status.title,
          is_active: status.is_active,
          target_time_in_status: status.target_time_in_status ?? null,
          celebration_enabled: status.celebration_enabled ?? false,
        },
      }),
    });
    return res.data;
  }

  // ==========================================================================
  // LIST ENTRY (PIPELINE) METHODS
  // ==========================================================================

  /**
   * Create a list entry (pipeline record)
   */
  async createListEntry(listSlug: string, parentRecordId: string, data: Record<string, any>, statusTitle?: string) {
    const body: any = {
      data: {
        parent_record_id: parentRecordId,
        entry_values: this.formatValues(data),
      }
    };

    if (statusTitle) {
      body.data.status_title = statusTitle;
    }

    return this.request(`/lists/${listSlug}/entries`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Update a list entry
   */
  async updateListEntry(listSlug: string, entryId: string, data: Record<string, any>, statusTitle?: string) {
    const body: any = {
      data: {
        entry_values: this.formatValues(data),
      }
    };

    if (statusTitle) {
      body.data.status_title = statusTitle;
    }

    return this.request(`/lists/${listSlug}/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * Query list entries
   */
  async queryListEntries(listSlug: string, query: {
    filter?: any;
    sort?: any[];
    limit?: number;
  }) {
    const res = await this.request(`/lists/${listSlug}/entries/query`, {
      method: 'POST',
      body: JSON.stringify(query),
    });
    return res.data;
  }

  // ==========================================================================
  // RECORD MANAGEMENT METHODS
  // ==========================================================================

  async createRecord(objectSlug: string, data: Record<string, any>) {
    return this.request(`/objects/${objectSlug}/records`, {
      method: 'POST',
      body: JSON.stringify({ data: { values: this.formatValues(data) } }),
    });
  }

  async updateRecord(objectSlug: string, recordId: string, data: Record<string, any>) {
    return this.request(`/objects/${objectSlug}/records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: { values: this.formatValues(data) } }),
    });
  }

  async getRecord(objectSlug: string, recordId: string) {
    const res = await this.request(`/objects/${objectSlug}/records/${recordId}`);
    return this.parseRecord(res.data);
  }

  async queryRecords(objectSlug: string, query: {
    filter?: any;
    sort?: any[];
    limit?: number;
  }) {
    const res = await this.request(`/objects/${objectSlug}/records/query`, {
      method: 'POST',
      body: JSON.stringify(query),
    });
    return res.data.map(this.parseRecord);
  }

  private formatValues(data: Record<string, any>) {
    const values: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      values[key] = value;
    }
    return values;
  }

  private parseRecord(record: any) {
    const parsed: Record<string, any> = { id: record.id.record_id };
    for (const [key, valueArray] of Object.entries(record.values)) {
      const arr = valueArray as any[];
      if (arr.length === 0) {
        parsed[key] = null;
      } else if (arr[0].option) {
        parsed[key] = arr[0].option.title;
      } else if (arr[0].target_record_id) {
        parsed[key] = arr[0].target_record_id;
      } else if (arr[0].value !== undefined) {
        parsed[key] = arr[0].value;
      } else {
        parsed[key] = arr[0];
      }
    }
    return parsed;
  }
}

export const attio = new AttioClient();
