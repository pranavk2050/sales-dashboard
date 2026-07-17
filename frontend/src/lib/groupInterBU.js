export function groupInterBU(rows) {
  const groups = new Map() // group_label -> Map(bu -> rows[])
  for (const r of rows) {
    const g = r.group_label || 'Ungrouped'
    if (!groups.has(g)) groups.set(g, new Map())
    const buMap = groups.get(g)
    const bu = r.bu || 'Unknown'
    if (!buMap.has(bu)) buMap.set(bu, [])
    buMap.get(bu).push(r)
  }
  return Array.from(groups, ([group, buMap]) => ({
    group,
    bus: Array.from(buMap, ([bu, projects]) => ({ bu, projects })),
  }))
}
