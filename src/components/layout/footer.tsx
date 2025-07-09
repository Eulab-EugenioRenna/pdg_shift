export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-6 md:px-8 md:py-0 bg-secondary/50">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          © {currentYear} Grace Services. Tutti i diritti riservati.
        </p>
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-right">
          Made by Eulab with ❤️ for Parola della Grazia
        </p>
      </div>
    </footer>
  );
}
