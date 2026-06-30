import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card py-8 text-muted-foreground print:hidden">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-full border border-primary/20 bg-white">
              <Image
                src="/logo.png"
                alt="Palamau Tiger Reserve Logo"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                Palamau Tiger Reserve
              </span>
              <span className="text-[9px] tracking-wide uppercase">
                Forest & Environment Department
              </span>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground sm:text-right">
            &copy; {new Date().getFullYear()} Palamau Tiger Reserve. Government of Jharkhand.
            <br />
            <span className="text-[10px] opacity-70">QR Tree Tracker (PTR) Initiative</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
