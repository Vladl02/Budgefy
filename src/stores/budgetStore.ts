import { useCallback, useSyncExternalStore } from "react";

export type BudgetOverrides = Record<string, number>;

let budgetOverridesState: BudgetOverrides = {};
const listeners = new Set<() => void>();

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

export const setBudgetOverrides = (next: BudgetOverrides) => {
  budgetOverridesState = { ...next };
  emit();
};

export const setBudgetForCategory = (categoryId: string, value: number) => {
  budgetOverridesState = {
    ...budgetOverridesState,
    [categoryId]: value,
  };
  emit();
};

export const clearBudgetForCategory = (categoryId: string) => {
  const next = { ...budgetOverridesState };
  delete next[categoryId];
  budgetOverridesState = next;
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
