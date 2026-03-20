
export enum ServiceStatus {
  PENDING = 'Pendente',
  IN_TRANSIT = 'Em Trânsito',
  PENDING_RETURN = 'Aguardando Retorno Porto',
  DELIVERED = 'Entregue',
  CANCELLED = 'Cancelado'
}

export enum AssetType {
  TRUCK = 'Camião Fixo',
  CRANE_TRUCK = 'Camião Grua',
  LIGHT_VEHICLE = 'Viatura Ligeira',
  TRAILER = 'Atrelado',
  MACHINE = 'Máquina Pesada'
}

export enum CargoType {
  CONTAINER = 'Contentorizada',
  BIG_BAG = 'Big Bag (Granel)',
  OTHER = 'Outros'
}

export enum MaintenanceType {
  PREVENTIVE = 'Preventiva',
  CORRECTIVE = 'Corretiva',
  INSPECTION = 'Inspeção'
}

export type Gender = 'Masculino' | 'Feminino' | 'Outro';
export type LifespanUnit = 'days' | 'weeks' | 'months';

export enum DeliveryStatus {
  IN_USE = 'Em Uso',
  EXPIRED = 'Expirado',
  REPLACED = 'Substituído',
  DAMAGED = 'Danificado/Extraviado'
}

export type SyncStatus = 'pending' | 'synced' | 'error';

export interface BaseEntity {
  id: string;
  syncStatus?: SyncStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee extends BaseEntity {
  name: string;
  biNumber: string;
  role: string;
  area: string;
  gender: Gender;
  admissionDate: string;
  photoUrl?: string;
}

export interface EPI extends BaseEntity {
  name: string;
  category: string;
  lifespanValue: number;
  lifespanUnit: LifespanUnit;
  registrationDate: string;
}

export interface Delivery extends BaseEntity {
  employeeId: string;
  epiId: string;
  deliveryDate: string;
  quantity: number;
  status: DeliveryStatus;
  justification?: string;
}

export interface MaintenanceRecord extends BaseEntity {
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  observations?: string;
  currentKm?: number;
  currentHours?: number;
  date: string;
  responsible: string;
  isUrgent: boolean;
  attachments?: string[]; // Armazena base64 dos ficheiros
}

export interface Vehicle extends BaseEntity {
  name: string;
  plate: string;
  type: AssetType;
  brand: string;
  model: string;
  year?: string;
  chassis?: string;
  fuelType?: string;
  photo?: string;
  lastMaintenanceDate: string;
  lastUsageUpdate?: string;
  lastMaintenanceKm?: number;
  lastMaintenanceHours?: number;
  previousKm?: number;    // Leitura da penúltima atualização (baseline do progress)
  previousHours?: number; // Horas da penúltima atualização (baseline do progress)
  maintenanceIntervalDays: number;
  maintenanceIntervalKm: number;
  currentKm: number;
  currentHours?: number;
}

export interface Driver extends BaseEntity {
  name: string;
  biNumber: string;
  licenseNumber: string;
  role: string;
  admissionDate: string;
  photoUrl?: string;
}

export interface Operation extends BaseEntity {
  driverId: string;
  truckId: string;
  trailerId?: string;
  cargoType: CargoType;
  cargoOtherSpecification?: string;
  containerNumber?: string;
  containerReturnDate?: string;
  client: string;
  origin: string;
  destination: string;
  startDate: string;
  status: ServiceStatus;
  notes?: string;
}

export interface AuthData {
  passwordHash: string;
  masterKeyHash: string;
  salt: string;
  failedAttempts: number;
  lockoutUntil: number | null;
  isFirstRun: boolean;
}

export interface AdminProfile {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  photoUrl?: string;
  logoUrl?: string;
}

export interface AppNotification extends BaseEntity {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  date: string;
  read: boolean;
  link?: string;
}

export interface FuelRecord extends BaseEntity {
  vehicleId: string;
  date: string;
  quantityLiters: number;
  amountPaid: number;
  currentKmOrHours: number;
  fuelType?: string;
  observations?: string;
}

export interface AppState {
  drivers: Driver[];
  vehicles: Vehicle[];
  operations: Operation[];
  maintenanceRecords: MaintenanceRecord[];
  fuelRecords: FuelRecord[];
  auth?: AuthData;
  admin?: AdminProfile;
  employees: Employee[];
  epis: EPI[];
  deliveries: Delivery[];
  notifications: AppNotification[];
}
