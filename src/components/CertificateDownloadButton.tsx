'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Award } from 'lucide-react';
import CertificateModal from './CertificateModal';

interface CertificateDownloadButtonProps {
  tree: {
    id: number;
    planter_name: string;
    species: string;
    planted_date: string;
    location?: string;
  };
}

export default function CertificateDownloadButton({ tree }: CertificateDownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Card className="shadow-sm border-border bg-card mb-6 overflow-hidden">
        <CardContent className="p-4 flex flex-col items-center justify-between gap-4 text-center sm:text-left sm:flex-row">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Club Membership</h3>
            <p className="text-xs text-muted-foreground">Download the official Panthera Tigris Club membership certificate.</p>
          </div>
          <Button
            onClick={() => setIsOpen(true)}
            className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs h-10 px-4 rounded-md gap-1.5 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Award className="h-4.5 w-4.5" />
            Download Certificate
          </Button>
        </CardContent>
      </Card>

      <CertificateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tree={tree}
      />
    </>
  );
}
