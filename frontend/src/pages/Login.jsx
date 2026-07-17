import { useState } from 'react'
import { login } from '../lib/auth'

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const user = await login(email, password)
      onSuccess(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-6 w-80">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Opportunity &amp; Lead Tracker</h1>
        <p className="text-xs text-gray-500 mb-4">Sign in to continue.</p>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Email</label>
        <input
          type="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
        />

        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full text-sm px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
