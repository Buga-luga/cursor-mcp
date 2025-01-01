import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Claude Desktop MCP',
  description: 'Model Context Protocol implementation for Claude Desktop',
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