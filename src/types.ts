
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
  INSPECTION = 'Inspeção',
  GENERAL = 'Geral'
}

export type Gender = 'Masculino' | 'Feminino' | 'Outro';
export type LifespanUnit = 'days' | 'weeks' | 'months';

export enum DeliveryStatus {
  IN_USE = 'Em Uso',
  EXPIRED = 'Expirado',
  REPLACED = 'Substituído',
  DAMAGED = 'Danificado/Extraviado'
}

export interface Employee {
  id: string;
  name: string;
  biNumber: string;
  role: string;
  area: string;
  gender: Gender;
  admissionDate: string;
  photoUrl?: string;
}

export interface EPI {
  id: string;
  name: string;
  category: string;
  lifespanValue: number;
  lifespanUnit: LifespanUnit;
  registrationDate: string;
}

export interface Delivery {
  id: string;
  employeeId: string;
  epiId: string;
  deliveryDate: string;
  quantity: number;
  status: DeliveryStatus;
  justification?: string;
}

export interface MaintenanceRecord {
  id: string;
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

export interface Vehicle {
  id: string;
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

export interface Driver {
  id: string;
  name: string;
  biNumber: string;
  licenseNumber: string;
  role: string;
  admissionDate: string;
  photoUrl?: string;
}

export interface Operation {
  id: string;
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

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  date: string;
  read: boolean;
  link?: string;
}

export interface AppState {
  drivers: Driver[];
  vehicles: Vehicle[];
  operations: Operation[];
  maintenanceRecords: MaintenanceRecord[];
  auth?: AuthData;
  admin?: AdminProfile;
  employees: Employee[];
  epis: EPI[];
  deliveries: Delivery[];
  notifications: AppNotification[];
}
