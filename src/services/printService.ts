import { MaintenanceRecord, Vehicle, AppState } from '../types';

export const handlePrintMaintenance = (record: MaintenanceRecord, data: AppState) => {
    const vehicle = data.vehicles.find(v => v.id === record.vehicleId);
    const attachmentsCount = record.attachments?.length || 0;

    const printContent = `
    <html>
      <head>
        <title>Ficha de Manutenção - ${vehicle?.plate || 'Ativo'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 0; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 30px; position: relative; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
          .header p { margin: 5px 0 0; font-size: 10px; font-weight: bold; color: #64748b; }
          .logo { position: absolute; top: 0; left: 0; height: 35px; object-fit: contain; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f172a; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 15px; background: #f8fafc; padding-top: 5px; padding-bottom: 5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
          .info-box { border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
          .info-box b { display: block; font-size: 8px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .info-box span { font-size: 11px; font-weight: 700; }
          .description { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; font-size: 12px; min-height: 120px; white-space: pre-wrap; }
          .footer { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .signature { border-top: 1px solid #0f172a; text-align: center; padding-top: 10px; }
          .signature b { font-size: 10px; display: block; text-transform: uppercase; }
          .signature span { font-size: 9px; color: #64748b; }
          .attachments-info { margin-top: 20px; font-size: 10px; color: #64748b; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          ${data.admin?.logoUrl ? `<img src="${data.admin.logoUrl}" class="logo" />` : ''}
          <h1>Relatório de Intervenção Técnica</h1>
          <p style="margin-top: 10px;">${data.admin?.companyName || 'TRANS-LOG PRO ANGOLA'}</p>
          <p>Data de Emissão: ${new Date().toLocaleDateString('pt-PT')}</p>
        </div>

        <div class="section">
          <div class="section-title">Dados do Ativo</div>
          <div class="grid">
            <div class="info-box"><b>Marca / Modelo</b><span>${vehicle?.brand || 'N/A'} ${vehicle?.model || ''}</span></div>
            <div class="info-box"><b>Matrícula</b><span>${vehicle?.plate || 'N/A'}</span></div>
            <div class="info-box"><b>Tipo de Ativo</b><span>${vehicle?.type || 'N/A'}</span></div>
            <div class="info-box"><b>Ano / Chassis</b><span>${vehicle?.year || 'N/A'} / ${vehicle?.chassis || 'N/A'}</span></div>
            <div class="info-box"><b>Km/Horas na Intervenção</b><span>${record.currentKm || record.currentHours || 'N/A'}</span></div>
            <div class="info-box"><b>Tipo de Serviço</b><span>${record.type}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Descrição dos Serviços Executados</div>
          <div class="description">
            ${record.description}
            ${record.observations ? '<br><br><b>Observações:</b><br>' + record.observations : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Responsabilidade</div>
          <div class="grid">
            <div class="info-box"><b>Técnico Responsável</b><span>${record.responsible}</span></div>
            <div class="info-box"><b>Data da Execução</b><span>${new Date(record.date).toLocaleDateString('pt-PT')}</span></div>
            <div class="info-box"><b>Status Final</b><span>Concluído / Operacional</span></div>
          </div>
        </div>
        
        ${attachmentsCount > 0 ? `<div class="attachments-info">* Este registo possui ${attachmentsCount} ficheiro(s) em anexo no sistema digital.</div>` : ''}

        <div class="footer">
          <div class="signature"><b>${record.responsible}</b><span>Assinatura do Técnico</span></div>
          <div class="signature"><b>Gestor de Frota</b><span>Carimbo e Assinatura</span></div>
        </div>

        <script>window.onload = function() { window.print(); setTimeout(window.close, 1000); }</script>
      </body>
    </html>
  `;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(printContent);
        win.document.close();
    }
};
