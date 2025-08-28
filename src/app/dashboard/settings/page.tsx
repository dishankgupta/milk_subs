import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">System configuration and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-gray-400 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Settings Coming Soon</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Panel</h3>
            <p className="text-gray-600">
              This section will contain system settings, user preferences, and configuration options.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Features like business hours, default values, and notification preferences will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}