
import React, { useState } from 'react';
import { Vehicle, AssetType, AuthData, MaintenanceRecord, AppState } from '../types';
import { handlePrintMaintenance } from '../services/printService';
import { Truck, Plus, Trash2, ShieldCheck, ShieldAlert, Wrench, Search, X, FileText, Settings, Activity, Gauge, Info, Fuel, Calendar, Loader2, Lock, Edit3, Image as ImageIcon, Printer, ArrowRight } from 'lucide-react';
import { Button, Input, Select, Modal, Card, Badge } from '../components/ui';

interface FleetProps {
  vehicles: Vehicle[];
  maintenanceRecords: MaintenanceRecord[];
  appData: AppState;
  auth?: AuthData;
  onAdd: (vehicle: Vehicle) => void;
  onUpdate: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}

const assetTypeOptions = Object.values(AssetType).map(t => ({ value: t, label: t }));
const fuelTypeOptions = [
  { value: 'Diesel', label: 'Diesel' },
  { value: 'Gasolina', label: 'Gasolina' },
  { value: 'Elétrico', label: 'Elétrico' }
];

const Fleet: React.FC<FleetProps> = ({ vehicles, maintenanceRecords, appData, auth, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewingDetails, setViewingDetails] = useState<Vehicle | null>(null);

  const [itemToDelete, setItemToDelete] = useState<Vehicle | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    name: '', plate: '', type: AssetType.TRUCK, brand: '', model: '', year: '', chassis: '', fuelType: 'Diesel',
    lastMaintenanceDate: new Date().toISOString().split('T')[0], maintenanceIntervalDays: 180, maintenanceIntervalKm: 10000, currentKm: 0, currentHours: 0, photo: ''
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewVehicle({ ...newVehicle, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTypeChange = (type: AssetType) => {
    let intervalKm = 10000;
    let intervalDays = 180;

    if (type === AssetType.LIGHT_VEHICLE) {
      intervalKm = 5000;
      intervalDays = 180;
    } else if (type === AssetType.MACHINE || type === AssetType.CRANE_TRUCK) {
      intervalKm = 1000;
      intervalDays = 180;
    }

    setNewVehicle({ ...newVehicle, type, maintenanceIntervalKm: intervalKm, maintenanceIntervalDays: intervalDays });
  };

  const getMaintenanceStatus = (v: Vehicle) => {
    const isHourBased = v.type === AssetType.MACHINE || v.type === AssetType.CRANE_TRUCK;
    const baseDate = new Date(v.lastMaintenanceDate);
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + v.maintenanceIntervalDays);
    const daysLeft = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return true;
    if (!isHourBased && v.currentKm && v.maintenanceIntervalKm) {
      const kmSince = v.currentKm - (v.lastMaintenanceKm || 0);
      if (kmSince >= v.maintenanceIntervalKm * 0.9) return true;
    }
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(newVehicle as Vehicle);
    } else {
      onAdd({ ...newVehicle as Vehicle, id: crypto.randomUUID(), lastUsageUpdate: new Date().toISOString().split('T')[0] });
    }
    setShowForm(false);
    setEditingId(null);
    setNewVehicle({
      name: '', plate: '', type: AssetType.TRUCK, brand: '', model: '', year: '', chassis: '', fuelType: 'Diesel',
      lastMaintenanceDate: new Date().toISOString().split('T')[0], maintenanceIntervalDays: 180, maintenanceIntervalKm: 10000, currentKm: 0, currentHours: 0, photo: ''
    });
  };

  const handleEdit = (v: Vehicle) => {
    setNewVehicle(v);
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleSecureDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToDelete) return;

    try {
      setIsVerifying(true);
      const isValid = await (window as any).electron?.ipcRenderer?.invoke('verify-password', confirmPassword, auth?.masterKeyHash);
      if (isValid) {
        onDelete(itemToDelete.id);
        setItemToDelete(null);
        setConfirmPassword('');
        setDeleteError(false);
      } else {
        setDeleteError(true);
        setTimeout(() => setDeleteError(false), 2000);
      }
    } catch (err) {
      console.error("Erro na validação da Master Key", err);
      setDeleteError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const filtered = vehicles.filter(v => {
    const term = search.toLowerCase();
    return v.plate.toLowerCase().includes(term) ||
      v.brand.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <Input
          placeholder="Buscar por placa ou modelo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Search size={18} />}
          className="flex-1"
        />
        <Button onClick={() => { setEditingId(null); setNewVehicle({ name: '', plate: '', type: AssetType.TRUCK, brand: '', model: '', year: '', chassis: '', fuelType: 'Diesel', lastMaintenanceDate: new Date().toISOString().split('T')[0], maintenanceIntervalDays: 180, maintenanceIntervalKm: 10000, currentKm: 0, currentHours: 0, photo: '' }); setShowForm(true); }} leftIcon={<Plus size={18} />}>
          Adicionar Ativo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((v, idx) => {
          const needsMaintenance = getMaintenanceStatus(v);
          return (
            <Card key={v.id} onClick={() => setViewingDetails(v)} className="relative overflow-hidden" padding="md" hover>
              {needsMaintenance && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/20 blur-[40px] -mr-12 -mt-12 animate-pulse"></div>
              )}
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110 duration-500 ${needsMaintenance ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-600/10 text-blue-400 border-blue-500/20'}`}>
                  {v.photo ? (
                    <img src={v.photo} className="w-full h-full object-cover" />
                  ) : (
                    <Truck size={32} strokeWidth={1.5} className={v.type === AssetType.TRAILER ? 'rotate-180' : ''} />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(v); }}>
                    <Edit3 size={18} />
                  </Button>
                  <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setItemToDelete(v); }}>
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
              <h4 className="text-2xl font-black text-white mb-1 uppercase tracking-tighter truncate relative z-10 leading-none">{v.brand} {v.model}</h4>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 relative z-10">{v.type}</p>
              
              <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Matrícula</p>
                  <p className="text-xs font-black text-text-main">{v.plate}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Status</p>
                  <Badge variant={needsMaintenance ? 'warning' : 'success'}>
                    {needsMaintenance ? 'Revisão' : 'Operacional'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between relative z-10 pt-2 border-t border-white/5 group-hover:border-blue-500/20 transition-colors">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-400 transition-colors">Ficha Técnica</span>
                <ArrowRight size={14} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={!!viewingDetails} onClose={() => setViewingDetails(null)} title={`${viewingDetails?.brand} ${viewingDetails?.model}`} size="xl">
        {viewingDetails && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 pb-3 mb-4">Ficha Técnica</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Calendar size={18} /></div>
                    <div><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Ano</p><p className="text-sm font-bold text-white">{viewingDetails.year || 'N/A'}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><Fuel size={18} /></div>
                    <div><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Combustível</p><p className="text-sm font-bold text-white">{viewingDetails.fuelType || 'Diesel'}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-500/10 rounded-lg text-slate-400"><Info size={18} /></div>
                    <div><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Chassis</p><p className="text-xs font-mono font-bold text-white">{viewingDetails.chassis || 'N/A'}</p></div>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 pb-3 mb-4">Manutenção</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Wrench size={18} /></div>
                    <div><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Última Revisão</p><p className="text-sm font-bold text-white">{new Date(viewingDetails.lastMaintenanceDate).toLocaleDateString()}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Gauge size={18} /></div>
                    <div><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">KM Atuais</p><p className="text-sm font-bold text-white">{viewingDetails.currentKm?.toLocaleString() || 0} KM</p></div>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 pb-3 mb-4">Ações</h3>
                <div className="space-y-3">
                  <Button variant="secondary" fullWidth onClick={() => handleEdit(viewingDetails)} leftIcon={<Edit3 size={16} />}>
                    Editar Ativo
                  </Button>
                  <Button variant="danger" fullWidth onClick={() => { setViewingDetails(null); setItemToDelete(viewingDetails); }} leftIcon={<Trash2 size={16} />}>
                    Eliminar
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Editar Ativo' : 'Novo Ativo'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Categoria"
              options={assetTypeOptions}
              value={newVehicle.type}
              onChange={e => handleTypeChange(e.target.value as AssetType)}
            />
            <Input
              label="Matrícula"
              placeholder="LD-00-00-AA"
              value={newVehicle.plate}
              onChange={e => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Marca"
              placeholder="Ex: Volvo, Scania..."
              value={newVehicle.brand}
              onChange={e => setNewVehicle({ ...newVehicle, brand: e.target.value })}
              required
            />
            <Input
              label="Modelo"
              placeholder="Ex: FH 540..."
              value={newVehicle.model}
              onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Ano"
              type="number"
              value={newVehicle.year}
              onChange={e => setNewVehicle({ ...newVehicle, year: e.target.value })}
            />
            <Input
              placeholder="Chassis"
              value={newVehicle.chassis}
              onChange={e => setNewVehicle({ ...newVehicle, chassis: e.target.value })}
            />
            <Select
              options={fuelTypeOptions}
              value={newVehicle.fuelType}
              onChange={e => setNewVehicle({ ...newVehicle, fuelType: e.target.value })}
            />
          </div>

          <div className="p-8 bg-blue-600/5 rounded-[2rem] border border-blue-500/10 space-y-6">
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2 italic">
              <Activity size={14} /> Configuração de Manutenção
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Última Revisão"
                type="date"
                value={newVehicle.lastMaintenanceDate}
                onChange={e => setNewVehicle({ ...newVehicle, lastMaintenanceDate: e.target.value })}
              />
              <Input
                label={`Intervalo (${newVehicle.type === AssetType.MACHINE || newVehicle.type === AssetType.CRANE_TRUCK ? 'Horas' : 'KM'})`}
                type="number"
                value={newVehicle.maintenanceIntervalKm === 0 ? '' : newVehicle.maintenanceIntervalKm}
                onChange={e => setNewVehicle({ ...newVehicle, maintenanceIntervalKm: e.target.value === '' ? 0 : Number(e.target.value) })}
              />
            </div>
          </div>

          <Button type="submit" fullWidth>
            {editingId ? 'Confirmar Alterações' : 'Finalizar Registro de Ativo'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Eliminar Ativo?" size="sm">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2rem] border border-rose-500/20 flex items-center justify-center shadow-xl shadow-rose-500/5">
            <ShieldAlert size={48} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">
              Confirme a <strong>Chave Mestra</strong> para remover <strong>{itemToDelete?.plate}</strong>.
            </p>
          </div>
          <form onSubmit={handleSecureDelete} className="w-full space-y-6 pt-4">
            <Input
              type="password"
              placeholder="Chave Mestra"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              leftIcon={<Lock size={20} />}
              required
            />
            <div className="flex gap-4">
              <Button type="button" variant="ghost" onClick={() => setItemToDelete(null)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" variant="danger" isLoading={isVerifying} leftIcon={<Trash2 size={18} />} className="flex-[2]">
                Confirmar
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default Fleet;
