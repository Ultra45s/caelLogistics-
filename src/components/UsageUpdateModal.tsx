
import React, { useState, useEffect } from 'react';
import { Vehicle, AssetType } from '../types';
import { X, Gauge, Truck, Settings2, ShieldCheck } from 'lucide-react';

interface UsageUpdateModalProps {
  vehicles: Vehicle[];
  onUpdate: (vehicle: Vehicle) => void;
  onClose: () => void;
}

const UsageUpdateModal: React.FC<UsageUpdateModalProps> = ({ vehicles, onUpdate, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [value, setValue] = useState<number | string>('');
  const currentVehicle = vehicles[currentIndex];

  useEffect(() => {
    if (currentVehicle) {
      const isHourBased = currentVehicle.type === AssetType.MACHINE || currentVehicle.type === AssetType.CRANE_TRUCK;
      setValue(isHourBased ? (currentVehicle.currentHours || 0) : currentVehicle.currentKm);
    }
  }, [currentVehicle]);

  const handleNext = () => {
    if (!currentVehicle) return;

    const numValue = Number(value) || 0;

    const isHourBased = currentVehicle.type === AssetType.MACHINE || currentVehicle.type === AssetType.CRANE_TRUCK;
    const updatedVehicle = {
      ...currentVehicle,
      currentKm: isHourBased ? currentVehicle.currentKm : numValue,
      currentHours: isHourBased ? numValue : currentVehicle.currentHours,
      lastUsageUpdate: new Date().toISOString().split('T')[0]
    };

    onUpdate(updatedVehicle);

    if (currentIndex < vehicles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  if (!currentVehicle) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[500] flex items-center justify-center p-4">
      <div className="glass-panel rounded-lg p-12 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-500 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full -mr-40 -mt-40"></div>

        <div className="flex items-center justify-between mb-10 relative z-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-500/10">
              <Settings2 size={28} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-main uppercase tracking-tight">Atualização Periódica</h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Monitoramento de Frota de 15 Dias</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{currentIndex + 1} de {vehicles.length}</p>
            <div className="w-24 h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / vehicles.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-8 border border-white/10 mb-10 relative z-10">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/30 shadow-2xl">
              {currentVehicle.photo ? (
                <img src={currentVehicle.photo} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Truck size={32} className="text-blue-400" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-black text-text-main uppercase tracking-tighter leading-none">{currentVehicle.brand} {currentVehicle.model}</h3>
              <p className="text-sm font-black text-blue-400 uppercase tracking-widest mt-2">{currentVehicle.plate}</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 block">
              {currentVehicle.type === AssetType.MACHINE || currentVehicle.type === AssetType.CRANE_TRUCK ? 'Horímetro Atual (Horas)' : 'Quilometragem Atual (KM)'}
            </label>
            <div className="relative">
              <Gauge className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={24} />
              <input
                autoFocus
                type="number"
                className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-lg text-2xl font-black text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-text text-left"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest ml-1">
              Último registo: {currentVehicle.type === AssetType.MACHINE || currentVehicle.type === AssetType.CRANE_TRUCK ? (currentVehicle.currentHours || 0) : currentVehicle.currentKm} {currentVehicle.type === AssetType.MACHINE || currentVehicle.type === AssetType.CRANE_TRUCK ? 'Horas' : 'KM'}
            </p>
          </div>
        </div>

        <div className="flex gap-6 relative z-10">
          <button
            onClick={onClose}
            className="flex-1 py-5 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:text-text-main transition-colors"
          >
            Atualizar Depois
          </button>
          <button
            onClick={handleNext}
            className="flex-[2] bg-blue-600 text-white py-5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 border border-blue-400/20"
          >
            <ShieldCheck size={20} /> {currentIndex === vehicles.length - 1 ? 'Finalizar Atualização' : 'Próximo Ativo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageUpdateModal;

