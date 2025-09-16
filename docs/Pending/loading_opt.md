# Dashboard Loading Optimization Plan
## Target: Sub-1 Second Load Times for All Pages

### Current Performance Issues Analysis

**Critical Bottlenecks Identified:**
- GET /dashboard/payments: 870ms (Target: <500ms)
- GET /dashboard/invoices: 831ms (Target: <500ms) 
- GET /dashboard/sales: 702ms (Target: <500ms)
- GET /dashboard/deliveries: 530ms (Target: <400ms)
- Compilation times: 350-750ms (Target: <200ms)

**Root Causes:**
1. **N+1 Query Patterns**: Customer actions execute individual queries per record
2. **Client-Side Architecture**: Heavy client components with useEffect data fetching
3. **No Pagination**: Loading entire datasets without limits
4. **Bundle Size Issues**: Large client-side imports causing compilation delays
5. **Missing React Optimizations**: No memoization patterns implemented

---

## Phase 1: Critical Database Query Optimization (Week 1)
**Expected Impact: 40-60% performance improvement**

### 1.1 Fix N+1 Query Pattern in Customer Actions
**File**: `src/lib/actions/customers.ts`
**Problem**: Lines 33-43 execute separate query for each customer with outstanding balance

**Solution**: Replace individual queries with single optimized query
```typescript
// BEFORE (N+1 pattern)
const customers = await Promise.all((data || []).map(async (summary) => {
  const { data: customer } = await supabase
    .from("customers")
    .select(`*, route:routes(*)`)
    .eq("id", summary.customer_id)
    .single()
  return customer
}))

// AFTER (Single optimized query)
const customerIds = (data || []).map(summary => summary.customer_id)
const { data: customers } = await supabase
  .from("customers")
  .select(`
    id, billing_name, contact_person, phone_primary, address_line1,
    route:routes(id, name),
    outstanding_summary:customer_outstanding_summary!inner(*)
  `)
  .in('id', customerIds)
  .order('billing_name')
```

### 1.2 Implement Query Pagination and Limits
**Files to Update**: All server actions in `src/lib/actions/`

**Implementation**:
```typescript
// Add to all major data fetching functions
interface PaginationOptions {
  limit?: number
  offset?: number
  dateRange?: { start: string; end: string }
}

// Example: getPayments() optimization
export async function getPayments(options: PaginationOptions = {}) {
  const { limit = 20, offset = 0, dateRange } = options
  
  let query = supabase
    .from('payments')
    .select(`
      id, amount, payment_date, payment_method, status,
      customer:customers(id, billing_name),
      invoice_count:invoice_payments(count)
    `)
    .order('payment_date', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (dateRange) {
    query = query
      .gte('payment_date', dateRange.start)
      .lte('payment_date', dateRange.end)
  }
  
  return await query
}
```

### 1.3 Database Index Optimization
**Execute these indexes** to support optimized queries:

```sql
-- Customer outstanding queries
CREATE INDEX IF NOT EXISTS idx_customers_billing_route 
ON customers(billing_name, route_id);

-- Payment queries with date filtering
CREATE INDEX IF NOT EXISTS idx_payments_date_customer 
ON payments(payment_date DESC, customer_id);

-- Delivery queries by date and status
CREATE INDEX IF NOT EXISTS idx_deliveries_date_status 
ON deliveries(delivery_date DESC, status);

-- Invoice queries for dashboard
CREATE INDEX IF NOT EXISTS idx_invoices_date_status 
ON invoice_metadata(invoice_date DESC, status);

-- Sales queries by date and type
CREATE INDEX IF NOT EXISTS idx_sales_date_type 
ON sales(sale_date DESC, sale_type);
```

---

## Phase 2: Server Component Migration (Week 1-2)
**Expected Impact: 30-50% performance improvement**

### 2.1 Convert Client Components to Server Components

**Priority Pages** (convert from client to server):

#### A. Payments Page
**File**: `src/app/dashboard/payments/page.tsx`
```typescript
// BEFORE: Client component with useEffect
"use client"
export default function PaymentsPage() {
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    getPaymentStats().then(setStats)
  }, [])
  
  return <PaymentsTable />
}

// AFTER: Server component with direct data fetching
export default async function PaymentsPage({
  searchParams
}: {
  searchParams: { page?: string; limit?: string; search?: string }
}) {
  const page = parseInt(searchParams.page || '1')
  const limit = parseInt(searchParams.limit || '20')
  
  const [stats, payments] = await Promise.all([
    getPaymentStats(),
    getPayments({ 
      limit, 
      offset: (page - 1) * limit,
      search: searchParams.search 
    })
  ])
  
  return (
    <div>
      <PaymentStats stats={stats} />
      <PaymentsTable 
        initialData={payments} 
        currentPage={page}
        limit={limit}
      />
    </div>
  )
}
```

#### B. Invoices Page Migration
**File**: `src/app/dashboard/invoices/page.tsx`
- Remove "use client" directive
- Move `getInvoiceStats()` to server-side data fetching
- Implement server-side pagination with searchParams

#### C. Deliveries Page Migration  
**File**: `src/app/dashboard/deliveries/page.tsx`
- Convert stats calculation to server-side
- Implement server-side filtering by date range
- Add pagination for delivery records

### 2.2 Progressive Loading Implementation

**Create optimized table components** with initial data + progressive loading:
```typescript
// src/components/optimized-table.tsx
interface OptimizedTableProps<T> {
  initialData: T[]
  totalCount: number
  currentPage: number
  pageSize: number
  onLoadMore: (page: number) => Promise<T[]>
}

const OptimizedTable = <T,>({ 
  initialData, 
  totalCount, 
  currentPage, 
  pageSize,
  onLoadMore 
}: OptimizedTableProps<T>) => {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  
  const loadNextPage = useCallback(async () => {
    if (data.length >= totalCount) return
    
    setLoading(true)
    try {
      const nextPage = Math.floor(data.length / pageSize) + 1
      const newData = await onLoadMore(nextPage)
      setData(prev => [...prev, ...newData])
    } finally {
      setLoading(false)
    }
  }, [data.length, totalCount, pageSize, onLoadMore])
  
  return (
    <div>
      <Table data={data} />
      {data.length < totalCount && (
        <button 
          onClick={loadNextPage}
          disabled={loading}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : `Load More (${totalCount - data.length} remaining)`}
        </button>
      )}
    </div>
  )
}
```

---

## Phase 3: React Performance Optimization (Week 2)
**Expected Impact: 20-30% performance improvement**

### 3.1 Implement React.memo for Heavy Components

**Customer Table Row Optimization**:
```typescript
// src/app/dashboard/customers/customers-table.tsx
const CustomerRow = React.memo(({ 
  customer, 
  onEdit, 
  onDelete 
}: {
  customer: Customer
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) => {
  // Memoize expensive calculations
  const displayRoute = useMemo(() => 
    customer.route?.name || 'No Route', 
    [customer.route?.name]
  )
  
  const outstandingAmount = useMemo(() => 
    formatCurrency(customer.outstanding_amount || 0),
    [customer.outstanding_amount]
  )
  
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="p-4">{customer.billing_name}</td>
      <td className="p-4">{customer.contact_person}</td>
      <td className="p-4">{displayRoute}</td>
      <td className="p-4 text-right font-mono">{outstandingAmount}</td>
      <td className="p-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => onEdit(customer.id)}
            size="sm"
            variant="outline"
          >
            Edit
          </Button>
          <Button 
            onClick={() => onDelete(customer.id)}
            size="sm"
            variant="destructive"
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  )
})
```

### 3.2 Optimize Table Filtering and Sorting

**Implement useMemo for data processing**:
```typescript
const CustomersTable = ({ customers }: { customers: Customer[] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' })
  const [filters, setFilters] = useState({ route: 'all', status: 'all' })
  
  // Debounce search to prevent excessive filtering
  const debouncedSearch = useDebounce(searchTerm, 300)
  
  // Memoize filtered and sorted data
  const processedData = useMemo(() => {
    let result = customers
    
    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase()
      result = result.filter(customer => 
        customer.billing_name.toLowerCase().includes(searchLower) ||
        customer.contact_person.toLowerCase().includes(searchLower) ||
        customer.phone_primary?.includes(debouncedSearch)
      )
    }
    
    // Apply route filter
    if (filters.route !== 'all') {
      result = result.filter(c => c.route_id === filters.route)
    }
    
    // Apply sorting
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const aVal = getNestedValue(a, sortConfig.key)
        const bVal = getNestedValue(b, sortConfig.key)
        
        if (sortConfig.direction === 'asc') {
          return aVal > bVal ? 1 : -1
        } else {
          return aVal < bVal ? 1 : -1
        }
      })
    }
    
    return result
  }, [customers, debouncedSearch, filters, sortConfig])
  
  return (
    <div>
      <TableFilters 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <SortableTable 
        data={processedData}
        sortConfig={sortConfig}
        onSort={setSortConfig}
      />
    </div>
  )
}
```

### 3.3 Component Bundle Size Optimization

**Optimize imports** across dashboard pages:
```typescript
// BEFORE: Heavy imports
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// AFTER: Selective imports
import { Search, Filter, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Dynamic import for heavy components
const ReportsModal = dynamic(() => import('@/components/reports-modal'), {
  loading: () => <div>Loading...</div>
})
```

---

## Phase 4: Virtual Scrolling Implementation (Week 3)
**Expected Impact: For 100+ record tables, 50-80% performance improvement**

### 4.1 Implement React-Window for Large Tables

**Install dependency**:
```bash
pnpm add react-window react-window-infinite-loader
pnpm add -D @types/react-window
```

**Create VirtualizedTable component**:
```typescript
// src/components/ui/virtualized-table.tsx
import { FixedSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'

interface VirtualizedTableProps<T> {
  data: T[]
  totalCount: number
  itemHeight: number
  hasNextPage: boolean
  isNextPageLoading: boolean
  loadNextPage: () => Promise<void>
  renderRow: (props: { index: number; style: any; data: T }) => React.ReactNode
}

export const VirtualizedTable = <T,>({
  data,
  totalCount,
  itemHeight,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
  renderRow
}: VirtualizedTableProps<T>) => {
  const itemCount = hasNextPage ? data.length + 1 : data.length
  const isItemLoaded = (index: number) => !!data[index]
  
  const Item = ({ index, style }: { index: number; style: any }) => {
    const item = data[index]
    
    if (!item) {
      return (
        <div style={style} className="flex items-center justify-center p-4">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full"></div>
        </div>
      )
    }
    
    return renderRow({ index, style, data: item })
  }
  
  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={itemCount}
      loadMoreItems={loadNextPage}
    >
      {({ onItemsRendered, ref }) => (
        <List
          ref={ref}
          height={600} // Fixed viewport height
          itemCount={itemCount}
          itemSize={itemHeight}
          onItemsRendered={onItemsRendered}
          className="border rounded-lg"
        >
          {Item}
        </List>
      )}
    </InfiniteLoader>
  )
}
```

### 4.2 Implement for High-Volume Tables

**Apply to Payments Table** (worst performer at 870ms):
```typescript
// src/app/dashboard/payments/payments-table.tsx
const PaymentsTable = ({ initialData }: { initialData: Payment[] }) => {
  const [data, setData] = useState(initialData)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  
  const loadNextPage = useCallback(async () => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      const nextPage = Math.floor(data.length / 20) + 1
      const newPayments = await getPayments({ 
        limit: 20, 
        offset: (nextPage - 1) * 20 
      })
      
      setData(prev => [...prev, ...newPayments])
      setHasNextPage(newPayments.length === 20)
    } finally {
      setIsLoading(false)
    }
  }, [data.length, isLoading])
  
  const renderPaymentRow = ({ index, style, data: payment }: any) => (
    <div style={style} className="flex border-b p-4 hover:bg-gray-50">
      <div className="flex-1">{payment.customer?.billing_name}</div>
      <div className="flex-1">₹{formatCurrency(payment.amount)}</div>
      <div className="flex-1">{formatDate(payment.payment_date)}</div>
      <div className="flex-1">{payment.payment_method}</div>
      <div className="flex-1">
        <span className={`px-2 py-1 rounded text-sm ${
          payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {payment.status}
        </span>
      </div>
    </div>
  )
  
  return (
    <VirtualizedTable
      data={data}
      totalCount={1000} // From server stats
      itemHeight={80}
      hasNextPage={hasNextPage}
      isNextPageLoading={isLoading}
      loadNextPage={loadNextPage}
      renderRow={renderPaymentRow}
    />
  )
}
```

---

## Phase 5: Advanced Database Optimization (Week 3-4)
**Expected Impact: 20-40% additional performance improvement**

### 5.1 Implement Query Result Caching

**Server-side caching for expensive queries**:
```typescript
// src/lib/cache.ts
interface CacheOptions {
  ttl: number // Time to live in seconds
  key: string
}

const cache = new Map<string, { data: any; expiry: number }>()

export async function withCache<T>(
  fn: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  const now = Date.now()
  const cached = cache.get(options.key)
  
  if (cached && cached.expiry > now) {
    return cached.data
  }
  
  const data = await fn()
  cache.set(options.key, {
    data,
    expiry: now + (options.ttl * 1000)
  })
  
  return data
}

// Usage in server actions
export async function getPaymentStats() {
  return withCache(async () => {
    // Expensive stats query
    const { data } = await supabase
      .from('customer_outstanding_summary')
      .select('*')
    
    return calculateStats(data)
  }, {
    key: 'payment-stats',
    ttl: 300 // 5 minutes
  })
}
```

### 5.2 Optimize Database Views with Materialized Views

**Create materialized views** for expensive calculations:
```sql
-- Create materialized view for customer outstanding summary
CREATE MATERIALIZED VIEW customer_outstanding_summary_mv AS 
SELECT 
  c.id as customer_id,
  c.billing_name,
  c.contact_person,
  c.phone_primary,
  r.name as route_name,
  COALESCE(SUM(im.total_amount), 0) as total_invoiced,
  COALESCE(SUM(ip.amount_allocated), 0) as total_paid,
  COALESCE(SUM(im.total_amount), 0) - COALESCE(SUM(ip.amount_allocated), 0) as outstanding_amount
FROM customers c
LEFT JOIN routes r ON c.route_id = r.id
LEFT JOIN invoice_metadata im ON c.id = im.customer_id
LEFT JOIN invoice_payments ip ON im.id = ip.invoice_id
GROUP BY c.id, c.billing_name, c.contact_person, c.phone_primary, r.name;

-- Create unique index for refresh performance
CREATE UNIQUE INDEX ON customer_outstanding_summary_mv (customer_id);

-- Schedule refresh every 30 minutes
-- (Implement in your deployment pipeline)
```

### 5.3 Implement Smart Query Batching

**Batch related queries** for dashboard stats:
```typescript
// src/lib/actions/dashboard-stats.ts
export async function getDashboardStats() {
  // Single query for all dashboard statistics
  const { data } = await supabase.rpc('get_dashboard_stats_batch')
  
  return {
    customers: {
      total: data.customer_count,
      withOutstanding: data.customers_with_outstanding,
      newThisMonth: data.new_customers_month
    },
    payments: {
      totalThisMonth: data.payments_this_month,
      pendingAmount: data.pending_payments,
      averageAmount: data.avg_payment_amount
    },
    deliveries: {
      todayCount: data.deliveries_today,
      pendingCount: data.pending_deliveries,
      completedPercent: data.delivery_completion_rate
    }
  }
}
```

**Create PostgreSQL function** for batched stats:
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats_batch()
RETURNS TABLE (
  customer_count BIGINT,
  customers_with_outstanding BIGINT,
  new_customers_month BIGINT,
  payments_this_month NUMERIC,
  pending_payments NUMERIC,
  avg_payment_amount NUMERIC,
  deliveries_today BIGINT,
  pending_deliveries BIGINT,
  delivery_completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM customers WHERE status = 'active') as customer_count,
    (SELECT COUNT(*) FROM customer_outstanding_summary_mv WHERE outstanding_amount > 0) as customers_with_outstanding,
    (SELECT COUNT(*) FROM customers WHERE created_at >= date_trunc('month', CURRENT_DATE)) as new_customers_month,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date >= date_trunc('month', CURRENT_DATE)) as payments_this_month,
    (SELECT COALESCE(SUM(outstanding_amount), 0) FROM customer_outstanding_summary_mv) as pending_payments,
    (SELECT COALESCE(AVG(amount), 0) FROM payments WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days') as avg_payment_amount,
    (SELECT COUNT(*) FROM deliveries WHERE delivery_date = CURRENT_DATE) as deliveries_today,
    (SELECT COUNT(*) FROM deliveries WHERE status = 'pending' AND delivery_date <= CURRENT_DATE) as pending_deliveries,
    (SELECT CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / COUNT(*)) ELSE 0 END FROM deliveries WHERE delivery_date = CURRENT_DATE) as delivery_completion_rate;
END;
$$ LANGUAGE plpgsql;
```

---

## Performance Monitoring & Validation

### Expected Results After Implementation

**Target Load Times** (down from current):
- Payments: 870ms → **<400ms** (55% improvement)
- Invoices: 831ms → **<350ms** (58% improvement)  
- Sales: 702ms → **<300ms** (57% improvement)
- Deliveries: 530ms → **<250ms** (53% improvement)
- Customers: 439ms → **<200ms** (54% improvement)

**Compilation Time Improvements**:
- Invoices: 750ms → **<200ms** (73% improvement)
- Customers: 359ms → **<150ms** (58% improvement)
- Reports: 360ms → **<150ms** (58% improvement)

### Monitoring Implementation

**Add performance tracking** to each optimized page:
```typescript
// src/lib/performance.ts
export function measurePagePerformance(pageName: string) {
  const startTime = performance.now()
  
  return {
    end: () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`[PERF] ${pageName}: ${duration.toFixed(2)}ms`)
      
      // Send to analytics if needed
      if (typeof window !== 'undefined' && duration > 1000) {
        console.warn(`[PERF WARNING] ${pageName} took ${duration.toFixed(2)}ms`)
      }
      
      return duration
    }
  }
}

// Usage in pages
export default async function PaymentsPage() {
  const perf = measurePagePerformance('PaymentsPage')
  
  const [stats, payments] = await Promise.all([
    getPaymentStats(),
    getPayments({ limit: 20 })
  ])
  
  perf.end()
  
  return <PaymentsContent stats={stats} payments={payments} />
}
```

---

## Implementation Timeline

### Week 1: Critical Fixes
- [ ] Fix N+1 query patterns in customer actions
- [ ] Add database indexes for frequent queries  
- [ ] Implement pagination in all major data fetching functions
- [ ] Convert payments and invoices pages to server components

### Week 2: React Optimization
- [ ] Add React.memo to all table row components
- [ ] Implement useMemo for data filtering and sorting
- [ ] Optimize component imports and bundle sizes
- [ ] Convert remaining client components to server components

### Week 3: Virtual Scrolling
- [ ] Implement virtualized tables for payments, invoices, deliveries
- [ ] Add progressive loading for large datasets
- [ ] Test performance with 100+ records

### Week 4: Advanced Optimization
- [ ] Implement query result caching
- [ ] Create materialized views for expensive calculations
- [ ] Add batched database functions for dashboard stats
- [ ] Performance monitoring and validation

---

## Success Metrics

**Primary Goals**:
- ✅ All dashboard pages load in <500ms
- ✅ Compilation times under 200ms
- ✅ Support for 100+ records without performance degradation
- ✅ Sub-1 second time to interactive on all pages

**Technical Metrics**:
- Database queries reduced by 70%
- Bundle sizes reduced by 40%
- React re-renders reduced by 60%
- Memory usage optimized for large datasets

**Business Impact**:
- Improved user experience and productivity
- Faster daily operations workflow
- Scalability for business growth
- Professional application performance standards