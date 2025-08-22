export interface User {
  id: number;
  email: string;
  role: 'resident' | 'admin';
  name?: string;
  unit?: string;
}

export interface ParkingCode {
  id: number;
  code: string;
  status: 'unassigned' | 'assigned' | 'used' | 'expired';
  assigned_at?: string;
  used_at?: string;
}

export interface Resident {
  id: number;
  name: string;
  email: string;
  unit: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Admin {
  id: number;
  email: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_type: 'admin' | 'resident' | 'system';
  actor_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values: any;
  new_values: any;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  created_at: string;
}

export interface DashboardStats {
  uploaded: number;
  assigned: number;
  used: number;
  expired: number;
  remaining: number;
}

export interface AccessSummary {
  resident_id: number;
  name: string;
  email: string;
  unit: string;
  code_count: number;
  has_codes: boolean;
  accessed: boolean;
  last_access_at?: string;
  view_count: number;
}