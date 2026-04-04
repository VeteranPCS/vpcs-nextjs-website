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
   * Create a select option for an attribute
   * Used to add options to existing select-type attributes
   */
  async createSelectOption(
    target: 'objects' | 'lists',
    objectOrListSlug: string,
    attributeSlug: string,
    optionTitle: string
  ): Promise<any> {
    const res = await this.request(
      `/${target}/${objectOrListSlug}/attributes/${attributeSlug}/options`,
      {
        method: 'POST',
        body: JSON.stringify({ data: { title: optionTitle } }),
      }
    );
    return res.data;
  }

  /**
   * Get select options for an attribute
   */
  async getSelectOptions(
    target: 'objects' | 'lists',
    objectOrListSlug: string,
    attributeSlug: string
  ): Promise<any[]> {
    const res = await this.request(
      `/${target}/${objectOrListSlug}/attributes/${attributeSlug}/options`
    );
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
   * Get all attributes for a list
   */
  async getListAttributes(listSlug: string): Promise<any[]> {
    const res = await this.request(`/lists/${listSlug}/attributes`);
    return res.data;
  }

  /**
   * Find the status attribute for a list
   * Lists need a status-type attribute to track stages
   */
  async getListStatusAttribute(listSlug: string): Promise<any | null> {
    const attributes = await this.getListAttributes(listSlug);
    // The status attribute has type "status"
    return attributes.find((attr: any) => attr.type === 'status') || null;
  }

  /**
   * Create or get the status attribute for a list
   * Status attributes are how lists track pipeline stages
   */
  async ensureListStatusAttribute(listSlug: string, attributeSlug: string = 'stage'): Promise<any> {
    // Check if status attribute already exists
    const existing = await this.getListStatusAttribute(listSlug);
    if (existing) {
      return existing;
    }

    // Create status attribute on the list
    // Status type requires a config object (can be empty)
    const res = await this.request(`/lists/${listSlug}/attributes`, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          title: 'Stage',
          api_slug: attributeSlug,
          type: 'status',
          description: 'Pipeline stage for tracking progress',
          is_required: false,
          is_unique: false,
          is_multiselect: false,
          config: {},
        },
      }),
    });
    return res.data;
  }

  /**
   * Get all statuses for a list's status attribute
   */
  async getListStatuses(listSlug: string): Promise<any[]> {
    const statusAttr = await this.getListStatusAttribute(listSlug);
    if (!statusAttr) {
      return [];
    }

    const attributeSlug = statusAttr.api_slug || statusAttr.id?.attribute_id;
    if (!attributeSlug) {
      return [];
    }

    const res = await this.request(`/lists/${listSlug}/attributes/${attributeSlug}/statuses`);
    return res.data || [];
  }

  /**
   * Create a status (stage) on a list's status attribute
   * If no status attribute exists, creates one first
   * Correct endpoint: POST /lists/{list}/attributes/{status_attr}/statuses
   */
  async createListStatus(listSlug: string, status: StatusDefinition): Promise<any> {
    // Ensure the status attribute exists (create if needed)
    const statusAttr = await this.ensureListStatusAttribute(listSlug, 'stage');

    const attributeSlug = statusAttr.api_slug || statusAttr.id?.attribute_id;
    if (!attributeSlug) {
      throw new Error(`Could not determine attribute slug for list "${listSlug}" status attribute`);
    }

    const res = await this.request(`/lists/${listSlug}/attributes/${attributeSlug}/statuses`, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          title: status.title,
          celebration_enabled: status.celebration_enabled ?? false,
          target_time_in_status: status.target_time_in_status ?? null,
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
   * @param listSlug - The list/pipeline slug (e.g., 'customer_deals')
   * @param parentObject - The parent object slug (e.g., 'customers')
   * @param parentRecordId - The parent record UUID
   * @param data - Entry values to set
   * @param statusTitle - Optional stage/status title (must match a configured status title exactly)
   * @param statusAttrSlug - Optional status attribute slug (defaults to 'stage')
   */
  async createListEntry(listSlug: string, parentObject: string, parentRecordId: string, data: Record<string, any>, statusTitle?: string, statusAttrSlug: string = 'stage') {
    // Build entry values with optional status
    const entryValues = this.formatValues(data);

    // Status must be set inside entry_values using the attribute slug
    // Format: { status: "Status Title" } - status is the status title as a string
    if (statusTitle) {
      entryValues[statusAttrSlug] = { status: statusTitle };
    }

    const body: any = {
      data: {
        parent_object: parentObject,
        parent_record_id: parentRecordId,
        entry_values: entryValues,
      }
    };

    return this.request(`/lists/${listSlug}/entries`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Update a list entry
   * @param statusAttrSlug - Optional status attribute slug (defaults to 'stage')
   */
  async updateListEntry(listSlug: string, entryId: string, data: Record<string, any>, statusTitle?: string, statusAttrSlug: string = 'stage') {
    // Build entry values with optional status
    const entryValues = this.formatValues(data);

    // Status must be set inside entry_values using the attribute slug
    // Format: { status: "Status Title" } - status is the status title as a string
    if (statusTitle) {
      entryValues[statusAttrSlug] = { status: statusTitle };
    }

    const body: any = {
      data: {
        entry_values: entryValues,
      }
    };

    return this.request(`/lists/${listSlug}/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * Get a single list entry by ID
   */
  async getListEntry(listSlug: string, entryId: string) {
    const res = await this.request(`/lists/${listSlug}/entries/${entryId}`);
    return this.parseListEntry(res.data);
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

  /**
   * Delete a list entry by entry ID
   */
  async deleteListEntry(listSlug: string, entryId: string) {
    return this.request(`/lists/${listSlug}/entries/${entryId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Delete a record by object slug and record ID
   */
  async deleteRecord(objectSlug: string, recordId: string) {
    return this.request(`/objects/${objectSlug}/records/${recordId}`, {
      method: 'DELETE',
    });
  }

  // ==========================================================================
  // NOTES
  // ==========================================================================

  /**
   * Create a note on an Attio record (appears on the record's timeline).
   * Requires `note:read-write` scope on the API key.
   */
  async createNote(
    parentObject: string,
    parentRecordId: string,
    title: string,
    content: string,
  ): Promise<any> {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          parent_object: parentObject,
          parent_record_id: parentRecordId,
          title,
          content,
          format: 'plaintext',
        },
      }),
    });
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

  /**
   * Assert (upsert) a record using PUT - this OVERWRITES multi-ref/multiselect fields
   * Unlike PATCH which appends, PUT completely replaces multi-ref field values
   * @param objectSlug - The object type (e.g., 'states')
   * @param matchingAttribute - Attribute slug used to find existing record (e.g., 'state_code')
   * @param data - Full record data including the matching attribute value
   */
  async assertRecord(objectSlug: string, matchingAttribute: string, data: Record<string, any>) {
    return this.request(`/objects/${objectSlug}/records?matching_attribute=${matchingAttribute}`, {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          values: this.formatValues(data),
        }
      }),
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
    offset?: number;
  }) {
    const res = await this.request(`/objects/${objectSlug}/records/query`, {
      method: 'POST',
      body: JSON.stringify(query),
    });
    return res.data.map(this.parseRecord);
  }

  private parseListEntry(entry: any) {
    const parsed: Record<string, any> = {
      entry_id: entry.id?.entry_id,
      parent_record_id: entry.parent_record_id,
    };
    if (entry.entry_values) {
      for (const [key, valueArray] of Object.entries(entry.entry_values)) {
        const arr = valueArray as any[];
        if (!arr || arr.length === 0) {
          parsed[key] = null;
        } else if (arr[0]?.status) {
          parsed[key] = arr[0].status.title || arr[0].status;
        } else if (arr[0]?.option) {
          parsed[key] = arr[0].option.title;
        } else if (arr[0]?.target_record_id) {
          parsed[key] = arr.length > 1
            ? arr.map((v: any) => v.target_record_id)
            : arr[0].target_record_id;
        } else if (arr[0]?.original_phone_number) {
          parsed[key] = arr[0].original_phone_number;
        } else if (arr[0]?.email_address) {
          parsed[key] = arr[0].email_address;
        } else if (arr[0]?.currency_value !== undefined) {
          parsed[key] = arr[0].currency_value;
        } else if (arr[0]?.value !== undefined) {
          parsed[key] = arr[0].value;
        } else {
          parsed[key] = arr[0];
        }
      }
    }
    return parsed;
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
        // Handle multi-ref fields: return array if multiple, single value if one
        parsed[key] = arr.length > 1
          ? arr.map((v: any) => v.target_record_id)
          : arr[0].target_record_id;
      } else if (arr[0].original_phone_number) {
        parsed[key] = arr[0].original_phone_number;
      } else if (arr[0].email_address) {
        parsed[key] = arr[0].email_address;
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
