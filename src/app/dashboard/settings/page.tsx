'use client'

import { useState, useEffect } from 'react'
import { Shield, Settings, Smartphone, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { EnrollMFADialog } from '@/components/auth/enroll-mfa-dialog'
import { toast } from 'sonner'

interface MFAFactor {
  id: string
  friendly_name: string
  factor_type: string
  status: string
  created_at: string
}

export default function SettingsPage() {
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [unenrolling, setUnenrolling] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadMFAFactors()
  }, [])

  const loadMFAFactors = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()

      if (error) {
        toast.error('Failed to load MFA factors: ' + error.message)
        return
      }

      // Combine TOTP and Phone factors and map to MFAFactor type
      const allFactors = [...(data.totp || []), ...(data.phone || [])].map(factor => ({
        ...factor,
        friendly_name: factor.friendly_name || 'Google Authenticator'
      }))
      setMfaFactors(allFactors)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Error loading MFA factors: ' + message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnenroll = async (factorId: string) => {
    if (
      !confirm(
        'Are you sure you want to disable two-factor authentication? This will make your account less secure.'
      )
    ) {
      return
    }

    setUnenrolling(factorId)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })

      if (error) {
        toast.error('Failed to unenroll: ' + error.message)
        return
      }

      toast.success('Two-factor authentication disabled')
      await loadMFAFactors()

      // Refresh session to downgrade AAL level
      await supabase.auth.refreshSession()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Error unenrolling: ' + message)
    } finally {
      setUnenrolling(null)
    }
  }

  const handleEnrolled = async () => {
    await loadMFAFactors()
    // Refresh session to upgrade AAL level
    await supabase.auth.refreshSession()
  }

  const hasMFAEnabled = mfaFactors.some((f) => f.status === 'verified')

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">System configuration and security preferences</p>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-600">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            {hasMFAEnabled && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Enabled
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              <p className="mt-2 text-sm text-gray-600">Loading MFA settings...</p>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              {!hasMFAEnabled && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-900 mb-1">
                        Two-factor authentication is not enabled
                      </h4>
                      <p className="text-sm text-yellow-800">
                        Protect your account by enabling two-factor authentication with
                        Google Authenticator. This adds an extra layer of security by
                        requiring a verification code in addition to your password.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enrolled Factors */}
              {mfaFactors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Enrolled Authentication Methods
                  </h4>
                  <div className="space-y-3">
                    {mfaFactors.map((factor) => (
                      <div
                        key={factor.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center">
                          <Smartphone className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {factor.friendly_name || 'Google Authenticator'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Added on{' '}
                              {new Date(factor.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              factor.status === 'verified'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {factor.status}
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUnenroll(factor.id)}
                            disabled={unenrolling === factor.id}
                          >
                            {unenrolling === factor.id ? 'Removing...' : 'Remove'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enable MFA Button */}
              {!hasMFAEnabled && (
                <div>
                  <Button onClick={() => setEnrollDialogOpen(true)} className="w-full sm:w-auto">
                    <Shield className="h-4 w-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                  <p className="mt-3 text-sm text-gray-500">
                    You&apos;ll need Google Authenticator app on your phone to set this up.
                  </p>
                </div>
              )}

              {/* Add Backup Factor */}
              {hasMFAEnabled && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Add Backup Method
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Add a backup authentication method in case you lose access to your
                    primary device.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setEnrollDialogOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Add Backup Authenticator
                  </Button>
                </div>
              )}

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  How Two-Factor Authentication Works
                </h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Install Google Authenticator on your phone</li>
                  <li>Scan the QR code to add your account</li>
                  <li>Enter the 6-digit code when logging in</li>
                  <li>Codes change every 30 seconds</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Other Settings Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-gray-400 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Other Settings</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Settings className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              Additional settings like business hours, notifications, and preferences
              will be available here.
            </p>
          </div>
        </div>
      </div>

      {/* Enrollment Dialog */}
      <EnrollMFADialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        onEnrolled={handleEnrolled}
      />
    </div>
  )
}
