'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { X, Download, ShieldCheck, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CO2_KG_PER_YEAR, CERTIFICATE_YEARS } from '@/lib/config';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: {
    id: number;
    planter_name: string;
    species: string;
    planted_date: string;
    location?: string;
  };
}

export default function CertificateModal({ isOpen, onClose, tree }: CertificateModalProps) {
  const [siteUrl, setSiteUrl] = useState('http://localhost:3000');
  const [isGenerating, setIsGenerating] = useState<string | null>(null); // 'png' | 'pdf' | null
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const totalCO2 = CO2_KG_PER_YEAR * CERTIFICATE_YEARS;
  const treeUrl = `${siteUrl}/tree/${tree.id}`;
  const displaySpecies = tree.species.split(' (')[0];
  const displayDate = new Date(tree.planted_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const displayLocation = tree.location || 'Qila Grassland';

  const generateImage = async (): Promise<string | null> => {
    if (!downloadRef.current) return null;
    try {
      // Ensure fonts/images are loaded by waiting a tiny bit
      await new Promise((r) => setTimeout(r, 200));
      const dataUrl = await toPng(downloadRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });
      return dataUrl;
    } catch (err) {
      console.error('Failed to generate image:', err);
      return null;
    }
  };

  const handleDownloadPNG = async () => {
    setIsGenerating('png');
    const dataUrl = await generateImage();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `PTR_Certificate_Tree_${tree.id}.png`;
      link.href = dataUrl;
      link.click();
    } else {
      alert('Failed to generate certificate image. Please try again.');
    }
    setIsGenerating(null);
  };

  const handleDownloadPDF = async () => {
    setIsGenerating('pdf');
    const dataUrl = await generateImage();
    if (dataUrl) {
      try {
        // Create jsPDF in landscape mode, matches the 1000x700 aspect ratio
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [1000, 700],
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, 1000, 700);
        pdf.save(`PTR_Certificate_Tree_${tree.id}.pdf`);
      } catch (err) {
        console.error('Failed to generate PDF:', err);
        alert('Failed to create PDF. Please try PNG download instead.');
      }
    } else {
      alert('Failed to generate certificate image. Please try again.');
    }
    setIsGenerating(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 print:hidden overflow-y-auto">
      <div className="bg-card border border-border rounded-lg max-w-3xl w-full shadow-xl p-6 text-left relative my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header bar */}
        <div className="flex justify-between items-center border-b border-border pb-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">Certificate Preview</h3>
            <p className="text-xs text-muted-foreground">Panthera Tigris Club official membership certificate</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none p-1 rounded-lg hover:bg-muted/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Certificate Display Area (Responsive scrollable container for preview) */}
        <div className="overflow-x-auto border border-border/80 rounded-md bg-muted/20 p-4 mb-6 flex justify-center">
          <div className="min-w-[640px] max-w-[700px] w-full aspect-[1.414] bg-white text-emerald-950 p-8 flex flex-col justify-between border-[12px] border-emerald-900 rounded-lg relative shadow-md">
            
            {/* Elegant Border Inset */}
            <div className="absolute inset-2 border-2 border-emerald-700 pointer-events-none rounded-sm opacity-60" />

            {/* Certificate content */}
            <div className="flex justify-between items-start border-b border-emerald-800/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border border-emerald-800/30 bg-white">
                  <Image src="/logo.png" alt="PTR Logo" fill className="object-cover" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-sans text-xs font-bold tracking-widest text-emerald-900 uppercase">
                    Palamau Tiger Reserve
                  </span>
                  <span className="text-[8px] font-bold tracking-widest text-emerald-700 uppercase">
                    Department of Forests & Environment
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                TAG ID #{tree.id}
              </span>
            </div>

            {/* Title */}
            <div className="text-center my-4">
              <h2 className="font-serif text-3xl font-bold tracking-widest text-emerald-900 uppercase">
                Certificate
              </h2>
              <div className="h-0.5 w-16 bg-emerald-700 mx-auto mt-1 opacity-60" />
            </div>

            {/* Body */}
            <div className="text-center space-y-4 px-6 text-emerald-900">
              <p className="text-xs italic text-emerald-800">This is to certify that</p>
              <p className="text-xl font-bold font-serif underline decoration-emerald-800 decoration-1 underline-offset-4 text-emerald-950">
                {tree.planter_name}
              </p>
              <p className="text-xs leading-relaxed max-w-md mx-auto">
                has planted a tree in Palamau Tiger Reserve and has become a proud member of
              </p>
              <p className="text-lg font-black tracking-wider text-emerald-800">
                #PANTHERA TIGRIS CLUB
              </p>
            </div>

            {/* Details and QR Code block */}
            <div className="flex justify-between items-end border-t border-emerald-800/20 pt-4 mt-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10px] text-left text-emerald-800 font-medium">
                <div>
                  <span className="block text-[8px] text-emerald-700/60 uppercase font-bold">Species</span>
                  <span className="font-semibold text-emerald-950">{displaySpecies}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-emerald-700/60 uppercase font-bold">Planted Date</span>
                  <span className="font-semibold text-emerald-950">{displayDate}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-emerald-700/60 uppercase font-bold">Location</span>
                  <span className="font-semibold text-emerald-950">{displayLocation}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-emerald-700/60 uppercase font-bold">Verification</span>
                  <span className="font-semibold text-emerald-950 flex items-center gap-0.5 text-emerald-700">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> Active Registry
                  </span>
                </div>
              </div>

              {/* QR Code in corner */}
              <div className="flex flex-col items-center gap-1 bg-white p-1.5 rounded border border-emerald-800/20 shadow-sm">
                <QRCodeSVG value={treeUrl} size={48} level="M" />
                <span className="text-[6px] font-bold font-mono tracking-tighter text-emerald-800">SCAN TO VERIFY</span>
              </div>
            </div>

            {/* Impact Message */}
            <div className="mt-4 border-t border-emerald-800/10 pt-3 text-center">
              <p className="text-[9px] text-emerald-800 leading-relaxed font-semibold italic">
                &ldquo;Over the next 10 years, your tree is estimated to absorb approximately {totalCO2} kg of CO2 — a real contribution to a greener Palamau. Thank you for being part of this.&rdquo;
              </p>
              <p className="text-[7px] text-emerald-700/50 mt-1">
                This is an educational estimate based on published averages, not a certified or tradable carbon credit.
              </p>
            </div>
          </div>
        </div>

        {/* Download actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end items-center border-t border-border pt-4">
          <Button
            variant="outline"
            disabled={isGenerating !== null}
            onClick={handleDownloadPNG}
            className="w-full sm:w-auto h-11 border-border font-semibold text-sm gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {isGenerating === 'png' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Image...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 text-primary" />
                Download Image (PNG)
              </>
            )}
          </Button>
          
          <Button
            disabled={isGenerating !== null}
            onClick={handleDownloadPDF}
            className="w-full sm:w-auto h-11 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-sm gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {isGenerating === 'pdf' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Download PDF Document
              </>
            )}
          </Button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* HIDDEN OFF-SCREEN FULL-SIZE ELEMENT FOR HQ EXPORT */}
        {/* ---------------------------------------------------- */}
        <div className="absolute top-[-9999px] left-[-9999px] pointer-events-none">
          <div
            ref={downloadRef}
            className="w-[1000px] h-[700px] bg-white text-emerald-950 p-12 flex flex-col justify-between border-[18px] border-emerald-900 relative rounded-sm"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {/* Elegant Border Inset */}
            <div className="absolute inset-3 border-4 border-emerald-700 pointer-events-none opacity-50" />

            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-emerald-800/20 pb-5">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-emerald-800/30 bg-white">
                  {/* Note: In off-screen DOM, local relative images will load via dataURL or local server */}
                  <img src="/logo.png" alt="PTR Logo" className="object-cover h-full w-full" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-base font-bold tracking-widest text-emerald-900 uppercase">
                    Palamau Tiger Reserve
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase">
                    Department of Forests & Environment
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-3 py-1 rounded border border-emerald-200">
                TAG ID #{tree.id}
              </span>
            </div>

            {/* Title */}
            <div className="text-center my-6">
              <h2 className="text-4xl font-bold tracking-widest text-emerald-900 uppercase">
                Certificate
              </h2>
              <div className="h-1 w-24 bg-emerald-700 mx-auto mt-2 opacity-60" />
            </div>

            {/* Body */}
            <div className="text-center space-y-6 px-12 text-emerald-900">
              <p className="text-sm italic text-emerald-800">This is to certify that</p>
              <p className="text-3xl font-bold underline decoration-emerald-800 decoration-1 underline-offset-4 text-emerald-950">
                {tree.planter_name}
              </p>
              <p className="text-sm leading-relaxed max-w-md mx-auto">
                has planted a tree in Palamau Tiger Reserve and has become a proud member of
              </p>
              <p className="text-2xl font-black tracking-wider text-emerald-800">
                #PANTHERA TIGRIS CLUB
              </p>
            </div>

            {/* Details Block */}
            <div className="flex justify-between items-end border-t-2 border-emerald-800/20 pt-6 mt-6">
              <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs text-left text-emerald-800 font-medium">
                <div>
                  <span className="block text-[9px] text-emerald-700/60 uppercase font-bold">Species</span>
                  <span className="font-semibold text-emerald-950 text-sm">{displaySpecies}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-emerald-700/60 uppercase font-bold">Planted Date</span>
                  <span className="font-semibold text-emerald-950 text-sm">{displayDate}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-emerald-700/60 uppercase font-bold">Location</span>
                  <span className="font-semibold text-emerald-950 text-sm">{displayLocation}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-emerald-700/60 uppercase font-bold">Verification</span>
                  <span className="font-semibold text-emerald-950 text-sm flex items-center gap-0.5 text-emerald-700">
                    <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" /> Active Registry
                  </span>
                </div>
              </div>

              {/* QR Code in corner */}
              <div className="flex flex-col items-center gap-1 bg-white p-2 rounded border border-emerald-800/20 shadow-sm">
                <QRCodeSVG value={treeUrl} size={64} level="M" />
                <span className="text-[7px] font-bold font-mono tracking-tighter text-emerald-800">SCAN TO VERIFY</span>
              </div>
            </div>

            {/* Impact Message */}
            <div className="mt-6 border-t border-emerald-800/10 pt-4 text-center">
              <p className="text-xs text-emerald-800 leading-relaxed font-semibold italic">
                &ldquo;Over the next 10 years, your tree is estimated to absorb approximately {totalCO2} kg of CO2 — a real contribution to a greener Palamau. Thank you for being part of this.&rdquo;
              </p>
              <p className="text-[8px] text-emerald-700/50 mt-1">
                This is an educational estimate based on published averages, not a certified or tradable carbon credit.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
