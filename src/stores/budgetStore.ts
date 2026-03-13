import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useSyncExternalStore } from "react";

export type BudgetOverrides = Record<string, number>;

const BUDGET_OVERRIDES_CACHE_KEY = "budget_overrides_v1";

let budgetOverridesState: BudgetOverrides = {};
const listeners = new Set<() => void>();
let mutationVersion = 0;
let persistQueue: Promise<void> = Promise.resolve();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => budgetOverridesState;

const emit = () => {
  listeners.forEach((listener) => listener());
};

const normalizeBudgetOverrides = (value: unknown): BudgetOverrides => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const normalized: BudgetOverrides = {};
  for (const [key, rawAmount] of Object.entries(value)) {
    const amount = Number(rawAmount);
    if (Number.isFinite(amount) && amount > 0) {
      normalized[String(key)] = amount;
    }
  }

  return normalized;
};

const queuePersist = (snapshot: BudgetOverrides) => {
  const payload = { ...snapshot };
  persistQueue = persistQueue
    .then(async () => {
      if (Object.keys(payload).length === 0) {
        await AsyncStorage.removeItem(BUDGET_OVERRIDES_CACHE_KEY);
        return;
      }
      await AsyncStorage.setItem(BUDGET_OVERRIDES_CACHE_KEY, JSON.stringify(payload));
    })
    .catch((error) => {
      console.error("Failed to persist budget overrides", error);
    });
};

const hydrateBudgetOverrides = async () => {
  const versionAtStart = mutationVersion;

  try {
    const raw = await AsyncStorage.getItem(BUDGET_OVERRIDES_CACHE_KEY);
    if (raw === null || mutationVersion !== versionAtStart) {
      return;
    }

    const parsed = JSON.parse(raw);
    budgetOverridesState = normalizeBudgetOverrides(parsed);
    emit();
  } catch (error) {
    console.error("Failed to hydrate budget overrides", error);
  }
};

export const setBudgetOverrides = (next: BudgetOverrides) => {
  budgetOverridesState = normalizeBudgetOverrides(next);
  mutationVersion += 1;
  queuePersist(budgetOverridesState);
  emit();
};

export const setBudgetForCategory = (categoryId: string, value: number) => {
  const normalizedValue = Number(value);
  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    clearBudgetForCategory(categoryId);
    return;
  }

  budgetOverridesState = { ...budgetOverridesState, [categoryId]: normalizedValue };
  mutationVersion += 1;
  queuePersist(budgetOverridesState);
  emit();
};

export const clearBudgetForCategory = (categoryId: string) => {
  const next = { ...budgetOverridesState };
  delete next[categoryId];
  budgetOverridesState = next;
  mutationVersion += 1;
  queuePersist(budgetOverridesState);
  emit();
};

export const useBudgetStore = () => {
  const budgetOverrides = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setAllBudgets = useCallback((next: BudgetOverrides) => {
    setBudgetOverrides(next);
  }, []);

  const setCategoryBudget = useCallback((categoryId: string, value: number) => {
    setBudgetForCategory(categoryId, value);
  }, []);

  const clearCategoryBudget = useCallback((categoryId: string) => {
    clearBudgetForCategory(categoryId);
  }, []);

  return {
    budgetOverrides,
    setAllBudgets,
    setCategoryBudget,
    clearCategoryBudget,
  };
};

void hydrateBudgetOverrides();
