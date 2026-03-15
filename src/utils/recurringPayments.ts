import AsyncStorage from "@react-native-async-storage/async-storage";

export type RecurringPayment = {
  id: string;
  name: string;
  amount: number;
  day: string;
  color: string;
  currency: string;
  notificationId?: string;
  reminderOffset?: number;
};

export type NextRecurringPayment = {
  payment: RecurringPayment;
  dueDate: Date;
  daysUntil: number;
};

export const RECURRING_PAYMENTS_STORAGE_KEY = "recurring_payments_v1";

export const DEFAULT_RECURRING_PAYMENTS: RecurringPayment[] = [
  { id: "1", name: "Netflix", amount: 15.99, day: "12", color: "#E50914", currency: "USD" },
];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeRecurringPayment = (candidate: unknown): RecurringPayment | null => {
  if (!candidate || typeof candidate !== "object") return null;

  const entry = candidate as Partial<RecurringPayment>;
  if (typeof entry.id !== "string" || entry.id.trim().length === 0) return null;
  if (typeof entry.name !== "string" || entry.name.trim().length === 0) return null;
  if (!isFiniteNumber(entry.amount)) return null;
  if (typeof entry.day !== "string" || entry.day.trim().length === 0) return null;
  if (typeof entry.color !== "string" || entry.color.trim().length === 0) return null;
  if (typeof entry.currency !== "string" || entry.currency.trim().length === 0) return null;

  return {
    id: entry.id,
    name: entry.name,
    amount: entry.amount,
    day: entry.day,
    color: entry.color,
    currency: entry.currency,
    notificationId: typeof entry.notificationId === "string" ? entry.notificationId : undefined,
    reminderOffset: isFiniteNumber(entry.reminderOffset) ? entry.reminderOffset : undefined,
  };
};

const cloneDefaultRecurringPayments = (): RecurringPayment[] =>
  DEFAULT_RECURRING_PAYMENTS.map((payment) => ({ ...payment }));

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const clampDueDay = (year: number, month: number, dayOfMonth: number): number => {
  const monthEndDay = new Date(year, month + 1, 0).getDate();
  return Math.max(1, Math.min(monthEndDay, dayOfMonth));
};

const resolveNextDueDate = (dayOfMonth: number, now: Date): Date => {
  const today = startOfDay(now);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const thisMonthDay = clampDueDay(currentYear, currentMonth, dayOfMonth);
  const thisMonthDue = new Date(currentYear, currentMonth, thisMonthDay);

  if (thisMonthDue.getTime() >= today.getTime()) {
    return thisMonthDue;
  }

  const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
  const nextMonthDay = clampDueDay(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), dayOfMonth);
  return new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextMonthDay);
};

export async function loadRecurringPayments(): Promise<RecurringPayment[]> {
  try {
    const stored = await AsyncStorage.getItem(RECURRING_PAYMENTS_STORAGE_KEY);
    if (!stored) {
      return cloneDefaultRecurringPayments();
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return cloneDefaultRecurringPayments();
    }

    const normalized = parsed
      .map((entry) => normalizeRecurringPayment(entry))
      .filter((entry): entry is RecurringPayment => entry !== null);

    return normalized;
  } catch (error) {
    console.error("Failed to load recurring payments", error);
    return cloneDefaultRecurringPayments();
  }
}

export async function saveRecurringPayments(payments: RecurringPayment[]): Promise<void> {
  await AsyncStorage.setItem(RECURRING_PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
}

export const getNextRecurringPayment = (
  payments: RecurringPayment[],
  now: Date = new Date(),
): NextRecurringPayment | null => {
  if (payments.length === 0) return null;

  const today = startOfDay(now).getTime();
  let winner: NextRecurringPayment | null = null;

  payments.forEach((payment) => {
    const parsedDay = Number.parseInt(payment.day, 10);
    if (!Number.isFinite(parsedDay)) return;

    const dueDate = resolveNextDueDate(parsedDay, now);
    const dueStart = startOfDay(dueDate).getTime();
    const daysUntil = Math.max(0, Math.round((dueStart - today) / 86_400_000));

    if (!winner || dueDate.getTime() < winner.dueDate.getTime()) {
      winner = { payment, dueDate, daysUntil };
    }
  });

  return winner;
};
