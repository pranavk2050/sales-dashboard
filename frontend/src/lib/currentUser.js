const KEY = 'dashboardUserName'

export function getUserName() {
  return localStorage.getItem(KEY) || ''
}

export function setUserName(name) {
  localStorage.setItem(KEY, name.trim())
}
