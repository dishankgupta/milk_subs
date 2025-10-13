'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface EnrollMFADialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEnrolled: () => void
}

export function EnrollMFADialog({
  open,
  onOpenChange,
  onEnrolled,
}: EnrollMFADialogProps) {
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (open && !factorId) {
      enrollFactor()
    }
  }, [open])

  const enrollFactor = async () => {
    setEnrolling(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Google Authenticator',
      })

      if (error) {
        setError(error.message)
        toast.error('Failed to start enrollment: ' + error.message)
        return
      }

      if (data) {
        setFactorId(data.id)
        setQrCode(data.totp.qr_code)
        setSecret(data.totp.secret)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast.error('Enrollment error: ' + message)
    } finally {
      setEnrolling(false)
    }
  }

  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create challenge
      const challenge = await supabase.auth.mfa.challenge({ factorId })
      if (challenge.error) {
        setError(challenge.error.message)
        toast.error('Challenge failed: ' + challenge.error.message)
        return
      }

      const challengeId = challenge.data.id

      // Verify code
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verifyCode,
      })

      if (verify.error) {
        setError(verify.error.message)
        toast.error('Verification failed: ' + verify.error.message)
        return
      }

      toast.success('Google Authenticator enabled successfully!')
      onEnrolled()
      onOpenChange(false)

      // Reset state
      setFactorId('')
      setQrCode('')
      setSecret('')
      setVerifyCode('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast.error('Verification error: ' + message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFactorId('')
    setQrCode('')
    setSecret('')
    setVerifyCode('')
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up Google Authenticator</DialogTitle>
          <DialogDescription>
            Scan the QR code with Google Authenticator app to enable two-factor
            authentication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {enrolling && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              <p className="mt-2 text-sm text-gray-600">Setting up MFA...</p>
            </div>
          )}

          {!enrolling && qrCode && (
            <>
              {/* QR Code */}
              <div className="flex justify-center py-4">
                <div
                  className="border-2 border-gray-200 rounded-lg p-4"
                  dangerouslySetInnerHTML={{ __html: qrCode }}
                />
              </div>

              {/* Secret (manual entry) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Or enter this code manually:
                </Label>
                <div className="flex items-center gap-2">
                  <Input value={secret} readOnly className="font-mono text-sm" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(secret)
                      toast.success('Secret copied to clipboard')
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Save this secret in a secure location as a backup
                </p>
              </div>

              {/* Verification Code Input */}
              <div className="space-y-2">
                <Label htmlFor="verify-code">
                  Enter 6-digit code from Google Authenticator
                </Label>
                <Input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm">
                <p className="font-medium text-blue-900 mb-2">Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Install Google Authenticator on your phone</li>
                  <li>Tap the + icon to add a new account</li>
                  <li>Scan the QR code above (or enter the secret manually)</li>
                  <li>Enter the 6-digit code shown in the app</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading || verifyCode.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Enable MFA'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
