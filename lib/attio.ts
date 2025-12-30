// lib/attio.ts

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
