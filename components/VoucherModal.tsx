import React, { useEffect, useState } from 'react';
import { Reservation, Client, Vehicle } from '../types';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { PDFDocument } from 'pdf-lib';
import toast from 'react-hot-toast';

interface VoucherModalProps {
  reservation: Reservation;
  client: Client | undefined;
  vehicle: Vehicle | undefined;
  onClose: () => void;
}

const VoucherModal: React.FC<VoucherModalProps> = ({ reservation, client, vehicle, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const formatDate = (date: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const money = (value: number) =>
    value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

  const voucherRef = `MDS-${reservation.id.toString().substring(0, 8).toUpperCase()}-${new Date().getFullYear()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('voucher-content');
    if (!element) return;

    setIsGenerating(true);
    const loadingToast = toast.loading('Gerando voucher completo...');

    try {
      const opt = {
        margin: 0,
        filename: `temp_voucher.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const voucherPdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      const voucherPdfBytes = await voucherPdfBlob.arrayBuffer();

      const mergedPdf = await PDFDocument.create();
      const voucherDoc = await PDFDocument.load(voucherPdfBytes);
      const copiedPages = await mergedPdf.copyPages(voucherDoc, voucherDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));

      const docsToAttach = [
        { url: client?.cnh_url, name: 'CNH' },
        { url: client?.address_proof_url, name: 'Comprovante' },
        { url: client?.selfie_url, name: 'Selfie' }
      ];

      for (const doc of docsToAttach) {
        if (doc.url && doc.url.toLowerCase().endsWith('.pdf')) {
          try {
            const response = await fetch(doc.url);
            const pdfBytes = await response.arrayBuffer();
            const externalDoc = await PDFDocument.load(pdfBytes);
            const externalPages = await mergedPdf.copyPages(externalDoc, externalDoc.getPageIndices());
            externalPages.forEach((page) => mergedPdf.addPage(page));
          } catch (err) {
            console.warn(`Não foi possível anexar o documento ${doc.name}:`, err);
          }
        }
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Voucher-Completo-${voucherRef}.pdf`;
      link.click();

      toast.success('Voucher gerado com anexos!', { id: loadingToast });
    } catch (err) {
      console.error('Erro ao gerar PDF mesclado:', err);
      toast.error('Erro ao gerar PDF completo.', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderDocument = (url?: string, label?: string) => {
    if (!url) return <div className="text-slate-300 font-bold italic text-center">Documento não disponível</div>;
    const isPdf = url.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 w-full h-full">
          <div className="size-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-4xl">picture_as_pdf</span>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Documento PDF</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">Será anexado ao final do arquivo gerado</p>
          </div>
        </div>
      );
    }
    return <img src={url} crossOrigin="anonymous" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />;
  };

  const totalReserva = reservation.total_value;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 overflow-y-auto no-print">
      <div className="bg-slate-200 w-full max-w-[900px] my-0 md:my-8 rounded-none md:rounded-2xl shadow-2xl flex flex-col relative animate-in fade-in zoom-in duration-300">

        <div className="sticky top-0 z-50 flex items-center justify-between p-4 border-b border-slate-100 bg-white/90 backdrop-blur-md md:rounded-t-2xl no-print">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined font-icon">description</span>
            <span className="font-bold text-sm uppercase tracking-wider">Voucher de Reserva</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleDownloadPDF} disabled={isGenerating} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50">
              {isGenerating ? <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">download</span>}
              PDF Completo
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-lg">print</span>
              Imprimir
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="bg-white text-slate-900 font-sans" id="voucher-content" style={{ width: '210mm', margin: '0 auto' }}>
          <div className="p-[15mm] md:p-[20mm] relative flex flex-col box-border" style={{ pageBreakAfter: 'always', height: '296mm' }}>
            <div className="flex items-center justify-between mb-6 border-b-4 border-primary pb-4">
              <div className="flex items-center gap-6">
                <div className="bg-primary p-3 rounded-xl shadow-lg flex items-center justify-center" style={{ backgroundColor: '#004d4d' }}>
                  <img src="/Logo-verde.png" alt="Midas" className="h-12 w-auto brightness-0 invert" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Midas Rent a Car</h1>
                  <p className="text-[10px] text-primary font-bold tracking-widest uppercase mt-1">Dirija sua liberdade</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-black text-primary">VOUCHER</h2>
                <div className="mt-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reserva ID</p>
                  <p className="text-xs font-mono font-bold text-slate-600">#{voucherRef}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <section>
                <div className="bg-slate-900 text-white px-4 py-1 rounded-r-full mb-4 flex items-center gap-2 w-fit pr-10">
                  <span className="material-symbols-outlined text-sm">person</span>
                  <h3 className="text-[10px] font-black uppercase tracking-widest">01. Identificação do Locatário</h3>
                </div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-10 px-4">
                  <div className="col-span-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nome Completo</p>
                    <p className="text-sm font-bold uppercase text-slate-900 border-b border-slate-100 pb-0.5">{client?.name || reservation.clientName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">CPF</p>
                    <p className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-0.5">{client?.cpf || '---'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nº da CNH</p>
                    <p className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-0.5">{client?.cnh_number || '---'}</p>
                  </div>
                </div>
              </section>

              <section>
                <div className="bg-slate-900 text-white px-4 py-1 rounded-r-full mb-4 flex items-center gap-2 w-fit pr-10">
                  <span className="material-symbols-outlined text-sm">directions_car</span>
                  <h3 className="text-[10px] font-black uppercase tracking-widest">02. Identificação do Veiculo</h3>
                </div>
                <div className="grid grid-cols-3 gap-6 px-4">
                  <div className="col-span-2 flex gap-4">
                    {vehicle?.image_url && <img src={vehicle.image_url} crossOrigin="anonymous" className="w-32 h-20 object-cover rounded-lg border border-slate-200" />}
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Modelo / Categoria</p>
                      <p className="text-sm font-bold uppercase text-slate-900">{vehicle?.model || reservation.vehicleModel} - {vehicle?.category || '---'}</p>
                      <div className="mt-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Placa</p>
                        <p className="text-sm font-bold font-mono text-primary bg-primary/5 border border-primary/20 px-3 py-0.5 rounded inline-block">{vehicle?.plate || reservation.vehiclePlate}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Câmbio</p>
                    <p className="text-sm font-bold text-slate-900 uppercase">{vehicle?.transmission || '---'}</p>
                  </div>
                </div>
              </section>

              <section>
                <div className="bg-slate-900 text-white px-4 py-1 rounded-r-full mb-4 flex items-center gap-2 w-fit pr-10">
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  <h3 className="text-[10px] font-black uppercase tracking-widest">03. Dados da Reserva</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                  <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Retirada Agendada</p>
                    <p className="text-base font-black text-primary">{formatDate(reservation.pickup_date)}</p>
                  </div>
                  <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Devolução Agendada</p>
                    <p className="text-base font-black text-primary">{formatDate(reservation.return_date)}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Diárias</p>
                    <p className="text-sm font-black text-slate-900">{reservation.days} {reservation.days === 1 ? 'dia' : 'dias'}</p>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Caução</p>
                    <p className="text-sm font-black text-amber-700">{money(reservation.security_deposit)}</p>
                  </div>
                  <div className="bg-rose-50 p-2 rounded-lg border border-rose-200">
                    <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-0.5">Franquia de Seguro</p>
                    <p className="text-sm font-black text-rose-700">{money(vehicle?.default_insurance_value || 0)}</p>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Seguro Premium</p>
                    <p className="text-sm font-black text-emerald-700 uppercase">Incluso</p>
                  </div>
                  <div className="col-span-3 bg-[#006666] p-5 rounded-2xl shadow-lg flex items-center justify-center gap-10 mt-2">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-0">Total da Reserva</p>
                      <p className="text-[9px] text-white/50 leading-none">(Diárias totais + serviços)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-white tracking-tight leading-none">{money(totalReserva)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 px-4 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                  <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Aviso de Responsabilidade</p>
                  <p className="text-[10px] font-bold text-rose-800 leading-tight">
                    O valor da Franquia de Seguro ({money(vehicle?.default_insurance_value || 0)}) NÃO está incluso no total da reserva. Este valor será cobrado APENAS em caso de sinistro (colisão, roubo, furto ou danos) conforme as condições gerais do contrato de locação.
                  </p>
                </div>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[9px] text-slate-400 font-medium text-center uppercase tracking-widest leading-relaxed">
                Este é um documento de pré-reserva. A operação de locação só será concluída após a avaliação da loja e assinatura do contrato.
              </p>
            </div>
          </div>

          <div className="p-[20mm] relative flex flex-col box-border" style={{ pageBreakAfter: 'always', height: '296mm' }}>
            <div className="bg-slate-900 text-white px-6 py-2 rounded-xl mb-10 flex items-center gap-3 w-full">
              <span className="material-symbols-outlined">identity_platform</span>
              <h3 className="text-sm font-black uppercase tracking-[0.2em]">04. Documentação do Locatário</h3>
            </div>
            <div className="space-y-[10mm] flex-1">
              <div className="space-y-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Carteira Nacional de Habilitação (CNH)</p>
                <div className="h-[65mm] w-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden p-2 relative">
                  {renderDocument(client?.cnh_url, 'CNH')}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Comprovante de Residência</p>
                <div className="h-[65mm] w-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden p-2 relative">
                  {renderDocument(client?.address_proof_url, 'Comprovante')}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Selfie com Documento</p>
                <div className="h-[65mm] w-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden p-2 relative">
                  {renderDocument(client?.selfie_url, 'Selfie')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherModal;