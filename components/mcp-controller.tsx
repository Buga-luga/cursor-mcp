'use client'

import { useState } from 'react'
import { useMCP } from '@/lib/hooks/use-mcp'
import type { ClaudeContext } from '@/types/mcp'

export function MCPController() {
  const { isConnected, context, error, updateContext, resetContext } = useMCP()
  const [formData, setFormData] = useState<ClaudeContext>({
    model: 'claude-2',
    temperature: 0.7,
    max_tokens: 1000,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await updateContext(formData)
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <h3 className="font-semibold">Error</h3>
        <p>{error.message}</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Model</label>
          <input
            type="text"
            value={formData.model}
            onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Temperature</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={formData.temperature}
            onChange={e => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Max Tokens</label>
          <input
            type="number"
            min="1"
            value={formData.max_tokens}
            onChange={e => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Update Context
          </button>
          <button
            type="button"
            onClick={resetContext}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Reset Context
          </button>
        </div>
      </form>

      {context && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h3 className="font-semibold">Current Context</h3>
          <pre className="mt-2 text-sm">{JSON.stringify(context, null, 2)}</pre>
        </div>
      )}
    </div>
  )
} 