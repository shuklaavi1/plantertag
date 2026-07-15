export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card py-4 text-muted-foreground print:hidden">
      <div className="container mx-auto max-w-5xl px-4">
        <p className="text-center text-[11px] text-muted-foreground">
          &copy; {new Date().getFullYear()} Palamau Tiger Reserve. Government of Jharkhand.
          <span className="mx-1.5 opacity-40">·</span>
          <span className="opacity-70">QR Tree Tracker (PTR) Initiative</span>
        </p>
      </div>
    </footer>
  );
}
