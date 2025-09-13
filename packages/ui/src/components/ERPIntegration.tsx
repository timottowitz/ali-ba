import { useState } from 'react'

interface ERPIntegrationProps {
  supplierId: string
}

export function ERPIntegration({ supplierId }: ERPIntegrationProps) {
  const [selectedProvider, setSelectedProvider] = useState('')
  const [settings, setSettings] = useState({
    apiEndpoint: '',
    apiKey: '',
    syncFrequency: 'daily',
    syncEnabled: false,
  })

  const erpProviders = [
    { id: 'sap', name: 'SAP', description: 'SAP ERP integration' },
    { id: 'oracle', name: 'Oracle', description: 'Oracle ERP Cloud' },
    { id: 'microsoft', name: 'Microsoft Dynamics', description: 'Dynamics 365' },
    { id: 'custom', name: 'Custom API', description: 'Custom REST API integration' },
  ]

  const handleSave = async () => {
    // This would integrate with the ERP integration mutation
    console.log('Saving ERP settings:', { selectedProvider, settings })
    alert('ERP integration settings saved! (Demo)')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">ERP Integration</h2>
      
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Select ERP Provider</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {erpProviders.map((provider) => (
              <div
                key={provider.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedProvider === provider.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    checked={selectedProvider === provider.id}
                    onChange={() => setSelectedProvider(provider.id)}
                    className="text-orange-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{provider.name}</div>
                    <div className="text-sm text-gray-500">{provider.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedProvider && (
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900">Integration Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Endpoint
                </label>
                <input
                  type="url"
                  value={settings.apiEndpoint}
                  onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://api.yourcompany.com/erp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your API key"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync Frequency
              </label>
              <select
                value={settings.syncFrequency}
                onChange={(e) => setSettings({ ...settings, syncFrequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="manual">Manual Only</option>
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="syncEnabled"
                checked={settings.syncEnabled}
                onChange={(e) => setSettings({ ...settings, syncEnabled: e.target.checked })}
                className="text-orange-600"
              />
              <label htmlFor="syncEnabled" className="text-sm font-medium text-gray-700">
                Enable automatic synchronization
              </label>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What will be synchronized?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Product inventory levels</li>
                <li>• Product pricing updates</li>
                <li>• New product additions</li>
                <li>• Product specifications</li>
                <li>• Order status updates</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                onClick={() => setSelectedProvider('')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Save Integration
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Status</h3>
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span className="text-gray-600">No active integration</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Configure an ERP integration above to automatically sync your product data.
        </p>
      </div>
    </div>
  )
}
