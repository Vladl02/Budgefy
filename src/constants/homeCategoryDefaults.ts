import { DEFAULT_CATEGORY_CATALOG } from "@/src/constants/defaultCategoryCatalog";

export type HomeCategoryDefault = {
  name: string;
  iconName: string;
  color: string;
};

export const HOME_CATEGORY_DEFAULTS: HomeCategoryDefault[] = DEFAULT_CATEGORY_CATALOG.map(
  ({ name, iconName, color }) => ({
    name,
    iconName,
    color,
  }),
);

export const HOME_COLOR_FALLBACKS: string[] = Array.from(
  new Set(HOME_CATEGORY_DEFAULTS.map((item) => item.color)),
);
