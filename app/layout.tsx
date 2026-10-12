import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'EYE – Denim Crafts Production Monitor',
  description: 'Production monitoring web app for Denim Crafts Karachi, tracking DCs (DC No), date-wise IN/OUT garment movements, running balances, and production gaps.',
  openGraph: {
    title: 'EYE – Denim Crafts Production Monitor',
    description: 'Production monitoring web app for Denim Crafts Karachi, tracking DCs (DC No), date-wise IN/OUT garment movements, running balances, and production gaps.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EYE – Denim Crafts Production Monitor',
    description: 'Production monitoring web app for Denim Crafts Karachi, tracking DCs (DC No), date-wise IN/OUT garment movements, running balances, and production gaps.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
