'use client'

import { Button } from "@/components/ui/button"

interface PrintButtonProps {
  printUrl: string
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary"
  children: React.ReactNode
  className?: string
}

export function PrintButton({ printUrl, variant = "outline", children, className }: PrintButtonProps) {
  const handlePrint = () => {
    window.open(printUrl, '_blank')
  }

  return (
    <Button 
      type="button" 
      variant={variant}
      onClick={handlePrint}
      className={className}
    >
      {children}
    </Button>
  )
}