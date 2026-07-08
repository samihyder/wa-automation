import Link from "next/link";

const linkClass =
  "text-primary hover:text-primary/80 underline-offset-4 hover:underline";

export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer
      className={
        className ??
        "mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-muted-foreground"
      }
    >
      <Link href="/privacy" className={linkClass}>
        Privacy Policy
      </Link>
      <span aria-hidden>·</span>
      <Link href="/terms" className={linkClass}>
        Terms of Service
      </Link>
      <span aria-hidden>·</span>
      <Link href="/data-deletion" className={linkClass}>
        Data Deletion
      </Link>
    </footer>
  );
}
