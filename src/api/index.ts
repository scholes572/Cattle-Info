// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const API_KEY = import.meta.env.VITE_API_KEY || 'cattle-keeper-secret-key-change-in-production';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

// Types
export interface Cattle {
  id: string;
  name: string;
  breed: string;
  dateOfBirth: string;
  sex: 'male' | 'female';
  imageUrl?: string;
  servedDate?: string;
  matingBreed?: string;
  expectedCalfBirthDate?: string;
  calfBirthDate?: string;
  calfSex?: 'male' | 'female';
  driedDate?: string;
  createdBy?: string;
  createdAt?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  lastEditedField?: string;
}

export interface MilkRecord {
  id: string;
  cowName: string;
  date: string;
  morningAmount: number;
  eveningAmount: number;
  totalDaily: number;
  addedBy?: string;
  createdAt?: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'add' | 'edit' | 'delete';
  category: 'cattle' | 'milk';
  target: string;
  details?: string;
}

export interface ImageUploadResponse {
  success: boolean;
  data?: {
    url: string;
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
  };
  error?: string;
}

// API Service
export const api = {
  // Cattle endpoints
  cattle: {
    list: async (): Promise<Cattle[]> => {
      const response = await fetch(`${API_URL}/cattle`, { headers });
      if (!response.ok) throw new Error('Failed to fetch cattle');
      const result = await response.json();
      return result.data || [];
    },
    
    create: async (data: Partial<Cattle>): Promise<Cattle> => {
      const response = await fetch(`${API_URL}/cattle`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create cattle');
      const result = await response.json();
      return result.data;
    },
    
    update: async (id: string, data: Partial<Cattle>): Promise<Cattle> => {
      const response = await fetch(`${API_URL}/cattle/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update cattle');
      const result = await response.json();
      return result.data;
    },
    
    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_URL}/cattle/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete cattle');
    },
  },
  
  // Milk endpoints
  milk: {
    list: async (): Promise<MilkRecord[]> => {
      const response = await fetch(`${API_URL}/milk`, { headers });
      if (!response.ok) throw new Error('Failed to fetch milk records');
      const result = await response.json();
      return result.data || [];
    },
    
    create: async (data: Partial<MilkRecord>): Promise<MilkRecord> => {
      const response = await fetch(`${API_URL}/milk`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create milk record');
      const result = await response.json();
      return result.data;
    },
    
    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_URL}/milk/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete milk record');
    },
  },
  
  // Activity endpoints
  activities: {
    list: async (): Promise<ActivityEntry[]> => {
      const response = await fetch(`${API_URL}/activities`, { headers });
      if (!response.ok) throw new Error('Failed to fetch activities');
      const result = await response.json();
      return result.data || [];
    },
    
    create: async (data: Omit<ActivityEntry, 'id' | 'timestamp'>): Promise<ActivityEntry> => {
      const response = await fetch(`${API_URL}/activities`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create activity');
      const result = await response.json();
      return result.data;
    },
  },
  
  // Image upload
  images: {
    upload: async (file: File): Promise<ImageUploadResponse> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/images/upload`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
        },
        body: formData,
      });
      
      const result = await response.json();
      return result;
    },
    
    delete: async (filename: string): Promise<void> => {
      const response = await fetch(`${API_URL}/images/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete image');
    },
  },
  
  // Health check
  health: async (): Promise<{ status: string; database: string }> => {
    const response = await fetch(`${API_URL.replace('/api/v1', '')}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },
};

// Helper function to log activity
export async function logActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    await api.activities.create(entry);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
