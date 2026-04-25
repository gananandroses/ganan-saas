import { supabase } from './client'

// ===== CUSTOMERS =====
export async function getCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createCustomer(customer: {
  name: string; city?: string; address?: string; phone?: string
  email?: string; monthly_price?: number; frequency?: string
  status?: string; notes?: string; tags?: string[]
  lat?: number; lng?: number
}) {
  const { data, error } = await supabase.from('customers').insert([customer]).select().single()
  if (error) throw error
  return data
}

export async function updateCustomer(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('customers').update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}

// ===== EMPLOYEES =====
export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees').select('*').order('name')
  if (error) throw error
  return data
}

export async function updateEmployeeLocation(id: string, lat: number, lng: number) {
  const { error } = await supabase
    .from('employees').update({ lat, lng }).eq('id', id)
  if (error) throw error
}

// ===== JOBS =====
export async function getJobs(filters?: { status?: string; date?: string }) {
  let query = supabase.from('jobs').select('*').order('job_date').order('job_time')
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.date) query = query.eq('job_date', filters.date)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createJob(job: {
  customer_id?: string; customer_name: string; address?: string
  job_date: string; job_time?: string; duration?: number
  type?: string; priority?: string; price?: number; notes?: string
  assigned_to?: string[]
}) {
  const { data, error } = await supabase.from('jobs').insert([job]).select().single()
  if (error) throw error
  return data
}

export async function updateJobStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('jobs').update({ status, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

// ===== INVENTORY =====
export async function getInventory() {
  const { data, error } = await supabase
    .from('inventory').select('*').order('category').order('name')
  if (error) throw error
  return data
}

export async function updateInventoryQuantity(id: string, quantity: number) {
  const { data, error } = await supabase
    .from('inventory')
    .update({ quantity, last_used: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

// ===== TRANSACTIONS =====
export async function getTransactions(type?: 'income' | 'expense') {
  let query = supabase.from('transactions').select('*').order('transaction_date', { ascending: false })
  if (type) query = query.eq('type', type)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createTransaction(tx: {
  customer_id?: string; customer_name?: string; type: string
  amount: number; description?: string; status?: string; method?: string
}) {
  const { data, error } = await supabase.from('transactions').insert([tx]).select().single()
  if (error) throw error
  return data
}

// ===== PROJECTS =====
export async function getProjects() {
  const { data, error } = await supabase
    .from('projects').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ===== DASHBOARD STATS =====
export async function getDashboardStats() {
  const [customersRes, jobsRes, transactionsRes] = await Promise.all([
    supabase.from('customers').select('id, status, monthly_price, balance'),
    supabase.from('jobs').select('id, status, price, job_date'),
    supabase.from('transactions').select('type, amount, status, transaction_date'),
  ])

  const customers = customersRes.data || []
  const jobs = jobsRes.data || []
  const transactions = transactionsRes.data || []

  const thisMonth = new Date().toISOString().slice(0, 7)

  const monthlyIncome = transactions
    .filter(t => t.type === 'income' && t.transaction_date?.startsWith(thisMonth))
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const activeCustomers = customers.filter(c => c.status === 'active' || c.status === 'vip').length
  const openBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0)

  const today = new Date().toISOString().split('T')[0]
  const todayJobs = jobs.filter(j => j.job_date === today)

  return { monthlyIncome, activeCustomers, openBalance, todayJobs: todayJobs.length, totalJobs: jobs.length }
}
