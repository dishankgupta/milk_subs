'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function MFAChallengeScreen() {
  const [verifyCode, setVerifyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    startChallenge()
  }, [])

  const startChallenge = async () => {
    setError('')
    try {
      // Get list of enrolled factors
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors()

      if (factorsError) {
        setError(factorsError.message)
        toast.error('Failed to load MFA factors: ' + factorsError.message)
        return
      }

      const totpFactor = factorsData.totp[0]

      if (!totpFactor) {
        setError('No TOTP factors found')
        toast.error('No Google Authenticator factor found. Please contact support.')
        return
      }

      setFactorId(totpFactor.id)

      // Create challenge
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id })

      if (challengeError) {
        setError(challengeError.message)
        toast.error('Challenge failed: ' + challengeError.message)
        return
      }

      setChallengeId(challengeData.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast.error('Error starting challenge: ' + message)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!verifyCode || verifyCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    if (!factorId || !challengeId) {
      setError('MFA not properly initialized. Please refresh the page.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verifyCode,
      })

      if (verifyError) {
        setError(verifyError.message)
        toast.error('Verification failed: ' + verifyError.message)
        setVerifyCode('') // Clear the code for retry
        return
      }

      toast.success('Successfully verified!')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast.error('Verification error: ' + message)
      setVerifyCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the 6-digit code from Google Authenticator
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleVerify}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mfa-code" className="sr-only">
              Verification Code
            </Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              disabled={loading || !challengeId}
              className="text-center text-3xl tracking-widest font-mono h-16"
              autoFocus
              autoComplete="one-time-code"
            />
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              disabled={loading || verifyCode.length !== 6 || !challengeId}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm">
            <p className="font-medium text-blue-900 mb-2">Need help?</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Open Google Authenticator app on your phone</li>
              <li>Find the code for this account</li>
              <li>Enter the 6-digit code above</li>
              <li>The code changes every 30 seconds</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  )
}
