export const metadata = {
  title: 'VeteranPCS Content Studio',
  description: 'VeteranPCS Content Management Studio',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
