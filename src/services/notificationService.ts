
import { AppState, AppNotification, AssetType, MaintenanceRecord } from '../types';

export const checkMaintenanceAlerts = (state: AppState): AppNotification[] => {
  const newNotifications: AppNotification[] = [];
  const now = new Date();

  state.vehicles.forEach(vehicle => {
    // 1. Verificação por Data
    const lastMaintenanceDate = new Date(vehicle.lastMaintenanceDate);
    const nextMaintenanceDate = new Date(lastMaintenanceDate);
    nextMaintenanceDate.setDate(lastMaintenanceDate.getDate() + vehicle.maintenanceIntervalDays);

    const diffTime = nextMaintenanceDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      const id = `maint-date-${vehicle.id}-${nextMaintenanceDate.toISOString().split('T')[0]}`;
      // Evitar duplicados se já existir uma notificação recente para este ID
      if (!state.notifications.some(n => n.id === id)) {
        newNotifications.push({
          id,
          title: 'Alerta de Manutenção (Data)',
          message: diffDays <= 0
            ? `A manutenção do veículo ${vehicle.plate} está ATRASADA.`
            : `Manutenção do veículo ${vehicle.plate} agendada para daqui a ${diffDays} dias.`,
          type: diffDays <= 0 ? 'error' : 'warning',
          date: now.toISOString(),
          read: false,
          link: 'maintenance'
        });
      }
    }

    // 2. Verificação por Quilometragem / Horas
    const isHourBased = vehicle.type === AssetType.MACHINE || vehicle.type === AssetType.CRANE_TRUCK;

    // Ignora registos com leitura zero para evitar falsos alertas
    const lastRecord = state.maintenanceRecords
      .filter(r => r.vehicleId === vehicle.id)
      .filter(r => isHourBased ? (r.currentHours || 0) > 0 : (r.currentKm || 0) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const lastUsage = isHourBased
      ? (lastRecord?.currentHours || 0)
      : (lastRecord?.currentKm || 0);

    const currentUsage = isHourBased
      ? (vehicle.currentHours || 0)
      : vehicle.currentKm;

    const usageSinceLast = currentUsage > 0 && lastUsage > 0 ? currentUsage - lastUsage : 0;
    const remainingUsage = vehicle.maintenanceIntervalKm - usageSinceLast;

    if (currentUsage > 0 && lastUsage > 0 && remainingUsage <= vehicle.maintenanceIntervalKm * 0.1) { // 10% restante
      const unit = isHourBased ? 'h' : 'km';
      const id = `maint-usage-${vehicle.id}-${Math.floor(currentUsage / 100)}`;

      if (!state.notifications.some(n => n.id === id)) {
        newNotifications.push({
          id,
          title: `Alerta de Manutenção (${unit.toUpperCase()})`,
          message: remainingUsage <= 0
            ? `O veículo ${vehicle.plate} ultrapassou o limite de ${unit.toUpperCase()} para manutenção.`
            : `O veículo ${vehicle.plate} atingirá o limite de manutenção em ${remainingUsage}${unit}.`,
          type: remainingUsage <= 0 ? 'error' : 'warning',
          date: now.toISOString(),
          read: false,
          link: 'maintenance'
        });
      }
    }
  });

  return newNotifications;
};
