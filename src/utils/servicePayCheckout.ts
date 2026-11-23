import { ServiceType, SERVICE_NAMES, getServicePrice } from '../config/creditConfig';
import { requestPayment, PaymentResponse } from '../payment';
import { supabase } from '../supabaseClient';

const PENDING_ORDER_KEY = 'mbtiju_pending_service_order';
const PAID_TICKETS_KEY = 'mbtiju_paid_service_tickets';

export interface PendingServiceOrder<T = any> {
  orderId: string;
  serviceType: ServiceType;
  serviceName: string;
  price: number;
  returnPath: string;
  payload: T;
  receiptToken?: string;
  remainingUses?: number;
  createdAt: number;
}

export async function buildServiceRequestHeaders(receiptToken?: string | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (receiptToken) {
    headers['X-Service-Receipt'] = receiptToken;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch {
    // ignore auth lookup errors for guests
  }
  return headers;
}

export function savePendingServiceOrder(order: PendingServiceOrder): void {
  try {
    localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(order));
  } catch {
    // ignore storage errors
  }
}

export function getPendingServiceOrder(): PendingServiceOrder | null {
  try {
    const raw = localStorage.getItem(PENDING_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.orderId || !parsed?.serviceType) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function promotePendingOrderToTicket(
  approvedOrderId: string,
  receiptToken?: string,
  remainingUses?: number
): PendingServiceOrder | null {
  const pending = getPendingServiceOrder();
  if (!pending || pending.orderId !== approvedOrderId) return null;
  const enriched: PendingServiceOrder = {
    ...pending,
    ...(receiptToken ? { receiptToken } : {}),
    ...(typeof remainingUses === 'number' ? { remainingUses } : {}),
  };
  try {
    const rawTickets = localStorage.getItem(PAID_TICKETS_KEY);
    const tickets: Record<string, PendingServiceOrder> = rawTickets ? JSON.parse(rawTickets) : {};
    tickets[enriched.serviceType] = enriched;
    localStorage.setItem(PAID_TICKETS_KEY, JSON.stringify(tickets));
    localStorage.removeItem(PENDING_ORDER_KEY);
  } catch {
    // ignore
  }
  return enriched;
}

export function consumePaidServiceTicket(
  acceptedTypes: ServiceType | ServiceType[]
): PendingServiceOrder | null {
  const list = Array.isArray(acceptedTypes) ? acceptedTypes : [acceptedTypes];
  try {
    const rawTickets = localStorage.getItem(PAID_TICKETS_KEY);
    if (!rawTickets) return null;
    const tickets: Record<string, PendingServiceOrder> = JSON.parse(rawTickets);
    for (const type of list) {
      if (tickets[type]) {
        const ticket = tickets[type];
        delete tickets[type];
        localStorage.setItem(PAID_TICKETS_KEY, JSON.stringify(tickets));
        return ticket;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function startServicePayment<T = any>(params: {
  serviceType: ServiceType;
  serviceName?: string;
  price?: number;
  returnPath: string;
  payload: T;
  customerName?: string;
}): Promise<PaymentResponse> {
  const {
    serviceType,
    serviceName = SERVICE_NAMES[serviceType] || '운세 분석 서비스',
    price = getServicePrice(serviceType),
    returnPath,
    payload,
    customerName = '비회원',
  } = params;

  const orderId = `SVC_${serviceType}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const customerKey = `GUEST_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  savePendingServiceOrder({
    orderId,
    serviceType,
    serviceName,
    price,
    returnPath,
    payload,
    createdAt: Date.now(),
  });

  return requestPayment({
    name: `${serviceName} (1회 이용권)`,
    amount: price,
    orderId,
    customerKey,
    customerName,
    successUrl: `${window.location.origin}/payment/success?serviceOrder=1`,
    failUrl: `${window.location.origin}/payment/fail`,
    metadata: {
      productId: 'single_service',
      serviceType,
      returnPath,
    },
  });
}
