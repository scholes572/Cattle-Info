// Cattle Types
export interface Cattle {
  id: string;
  name: string;
  breed: string;
  dateOfBirth: string;
  sex: 'male' | 'female';
  imageUrl?: string;
  
  // Breeding info (female only)
  servedDate?: string;
  matingBreed?: string;
  expectedCalfBirthDate?: string;
  calfBirthDate?: string;
  calfSex?: 'male' | 'female';
  driedDate?: string;
  
  // Audit trail
  createdBy?: string;
  createdAt?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  lastEditedField?: string;
}

export interface CreateCattleInput {
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
}

export interface UpdateCattleInput {
  name?: string;
  breed?: string;
  dateOfBirth?: string;
  sex?: 'male' | 'female';
  imageUrl?: string;
  servedDate?: string;
  matingBreed?: string;
  expectedCalfBirthDate?: string;
  calfBirthDate?: string;
  calfSex?: 'male' | 'female';
  driedDate?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  lastEditedField?: string;
}

// Milk Records Types
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

export interface CreateMilkRecordInput {
  cowName: string;
  date: string;
  morningAmount: number;
  eveningAmount: number;
  addedBy?: string;
}

// Activity Types
export interface ActivityEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'add' | 'edit' | 'delete';
  category: 'cattle' | 'milk';
  target: string;
  details?: string;
}

export interface CreateActivityInput {
  user: string;
  action: 'add' | 'edit' | 'delete';
  category: 'cattle' | 'milk';
  target: string;
  details?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
