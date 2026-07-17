const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export default function FiltersBar({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col">
        <label className="text-xs text-gray-500 mb-1">Customer</label>
        <input
          type="text"
          value={filters.customer ?? ''}
          onChange={(e) => set({ customer: e.target.value })}
          placeholder="Search customer"
          className="border border-gray-300 rounded px-2 py-1 text-sm w-40"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-gray-500 mb-1">Quarter</label>
        <select
          value={filters.quarter ?? ''}
          onChange={(e) => set({ quarter: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {QUARTERS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-gray-500 mb-1">Min value (Cr)</label>
        <input
          type="number"
          value={filters.min_value ?? ''}
          onChange={(e) => set({ min_value: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-gray-500 mb-1">Max value (Cr)</label>
        <input
          type="number"
          value={filters.max_value ?? ''}
          onChange={(e) => set({ max_value: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-gray-500 mb-1">Status contains</label>
        <input
          type="text"
          value={filters.q ?? ''}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search present status"
          className="border border-gray-300 rounded px-2 py-1 text-sm w-48"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 pb-1.5">
        <input
          type="checkbox"
          checked={!!filters.overdue}
          onChange={(e) => set({ overdue: e.target.checked ? 'true' : '' })}
        />
        Overdue only
      </label>

      <div className="flex flex-col">
        <label className="text-xs text-gray-500 mb-1">Sort by</label>
        <select
          value={filters.sort_by ?? 'timeline'}
          onChange={(e) => set({ sort_by: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value="timeline">Timeline</option>
          <option value="value">Value</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-gray-500 mb-1">Direction</label>
        <select
          value={filters.sort_dir ?? 'asc'}
          onChange={(e) => set({ sort_dir: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => onChange({ sort_by: 'timeline', sort_dir: 'asc' })}
        className="text-sm text-blue-600 hover:underline pb-1.5"
      >
        Clear filters
      </button>
    </div>
  )
}
