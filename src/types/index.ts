// Core User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: Department;
  position: string;
  employeeId?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  VIEWER = 'viewer',
}

export enum Department {
  FINANCE = 'finance',
  HR = 'hr',
  ENGINEERING = 'engineering',
  MANUFACTURING = 'manufacturing',
  CONTROL = 'control',
  SALES = 'sales',
  IT = 'it',
  QUALITY = 'quality',
}

// Authentication Types
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: Department;
  position: string;
  employeeId?: string;
}

// Financial Module Types
export interface Account {
  id: string;
  accountNumber: string;
  name: string;
  type: AccountType;
  category: AccountCategory;
  balance: number;
  currency: string;
  isActive: boolean;
  parentAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum AccountCategory {
  CURRENT_ASSETS = 'current_assets',
  FIXED_ASSETS = 'fixed_assets',
  CURRENT_LIABILITIES = 'current_liabilities',
  LONG_TERM_LIABILITIES = 'long_term_liabilities',
  OWNERS_EQUITY = 'owners_equity',
  OPERATING_REVENUE = 'operating_revenue',
  OPERATING_EXPENSES = 'operating_expenses',
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  date: Date;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  accountId: string;
  categoryId: string;
  reference?: string;
  attachments?: string[];
  createdBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// HR Module Types
export interface Employee {
  id: string;
  userId: string;
  employeeId: string;
  hireDate: Date;
  terminationDate?: Date;
  salary: number;
  currency: string;
  position: string;
  department: Department;
  managerId?: string;
  workLocation: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  emergencyContact: EmergencyContact;
  documents: EmployeeDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
  ON_LEAVE = 'on_leave',
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface EmployeeDocument {
  id: string;
  type: DocumentType;
  name: string;
  filePath: string;
  uploadDate: Date;
  expiryDate?: Date;
}

export enum DocumentType {
  CONTRACT = 'contract',
  ID_PROOF = 'id_proof',
  CERTIFICATE = 'certificate',
  PERFORMANCE_REVIEW = 'performance_review',
  OTHER = 'other',
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  totalHours?: number;
  status: AttendanceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
  LEAVE = 'leave',
}

export interface Leave {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  PERSONAL = 'personal',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  UNPAID = 'unpaid',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

// Engineering Module Types
export interface Project {
  id: string;
  projectNumber: string;
  name: string;
  description: string;
  clientId: string;
  managerId: string;
  startDate: Date;
  endDate?: Date;
  status: ProjectStatus;
  priority: Priority;
  budget: number;
  actualCost: number;
  progress: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Design {
  id: string;
  projectId: string;
  name: string;
  description: string;
  type: DesignType;
  version: string;
  filePath: string;
  fileSize: number;
  format: string;
  thumbnail?: string;
  metadata: DesignMetadata;
  createdBy: string;
  reviewedBy?: string;
  status: DesignStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum DesignType {
  CAD_2D = 'cad_2d',
  CAD_3D = 'cad_3d',
  SCHEMATIC = 'schematic',
  LAYOUT = 'layout',
  RENDERING = 'rendering',
  ANIMATION = 'animation',
}

export enum DesignStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export interface DesignMetadata {
  dimensions?: {
    width: number;
    height: number;
    depth?: number;
  };
  materials?: string[];
  components?: string[];
  notes?: string;
}

// Manufacturing Module Types
export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  projectId: string;
  productId: string;
  quantity: number;
  priority: Priority;
  status: WorkOrderStatus;
  startDate: Date;
  dueDate: Date;
  completedDate?: Date;
  assignedTo: string[];
  materials: MaterialRequirement[];
  operations: Operation[];
  qualityChecks: QualityCheck[];
  createdAt: Date;
  updatedAt: Date;
}

export enum WorkOrderStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface MaterialRequirement {
  id: string;
  materialId: string;
  quantity: number;
  unit: string;
  allocated: number;
  consumed: number;
}

export interface Operation {
  id: string;
  name: string;
  description: string;
  sequence: number;
  estimatedTime: number;
  actualTime?: number;
  status: OperationStatus;
  assignedTo?: string;
  startTime?: Date;
  endTime?: Date;
  notes?: string;
}

export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

export interface QualityCheck {
  id: string;
  name: string;
  description: string;
  criteria: string[];
  status: QualityCheckStatus;
  inspector?: string;
  result?: QualityCheckResult;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum QualityCheckStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PASSED = 'passed',
  FAILED = 'failed',
}

export interface QualityCheckResult {
  passed: boolean;
  measurements: Measurement[];
  defects?: Defect[];
}

export interface Measurement {
  parameter: string;
  expected: number;
  actual: number;
  tolerance: number;
  unit: string;
}

export interface Defect {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
}

// Control Module Types
export interface ControlSystem {
  id: string;
  name: string;
  type: ControlSystemType;
  description: string;
  location: string;
  status: SystemStatus;
  specifications: ControlSpecifications;
  components: ControlComponent[];
  maintenanceSchedule: MaintenanceSchedule[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ControlSystemType {
  ELECTRICAL = 'electrical',
  PNEUMATIC = 'pneumatic',
  HYDRAULIC = 'hydraulic',
  ELECTRONIC = 'electronic',
  PLC = 'plc',
  SCADA = 'scada',
}

export enum SystemStatus {
  OPERATIONAL = 'operational',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
  ERROR = 'error',
}

export interface ControlSpecifications {
  voltage?: number;
  current?: number;
  pressure?: number;
  flow?: number;
  temperature?: number;
  power?: number;
}

export interface ControlComponent {
  id: string;
  name: string;
  type: ComponentType;
  manufacturer: string;
  model: string;
  serialNumber: string;
  specifications: Record<string, any>;
  status: ComponentStatus;
  installationDate: Date;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
}

export enum ComponentType {
  SENSOR = 'sensor',
  ACTUATOR = 'actuator',
  CONTROLLER = 'controller',
  VALVE = 'valve',
  PUMP = 'pump',
  MOTOR = 'motor',
  RELAY = 'relay',
  SWITCH = 'switch',
}

export enum ComponentStatus {
  OPERATIONAL = 'operational',
  WARNING = 'warning',
  FAULT = 'fault',
  MAINTENANCE = 'maintenance',
}

export interface MaintenanceSchedule {
  id: string;
  type: MaintenanceType;
  frequency: MaintenanceFrequency;
  lastPerformed?: Date;
  nextDue: Date;
  assignedTo?: string;
  status: MaintenanceStatus;
  notes?: string;
}

export enum MaintenanceType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  PREDICTIVE = 'predictive',
  EMERGENCY = 'emergency',
}

export enum MaintenanceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  AS_NEEDED = 'as_needed',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

// Common Types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// File Upload Types
export interface FileUpload {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  TASK = 'task',
  APPROVAL = 'approval',
} 