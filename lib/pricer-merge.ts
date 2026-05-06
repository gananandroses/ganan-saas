// ── Shared utility: merge user's pricer_settings into PRICE_LIST ────────────
// Used by /quote/new, /quote/[id]/edit and any other page that needs the
// user's effective price list (custom items + overrides + hidden items)
// to stay in sync with the /pricer page.

import { PRICE_LIST, PRICE_CATEGORIES, type PriceItem, type PriceCategory } from "@/lib/price-list-data";
import { supabase } from "@/lib/supabase/client";

interface CustomCategory { key: string; label: string; emoji: string; }

export interface PricerSettings {
  customItems: PriceItem[];
  customCategories: CustomCategory[];
  overridePrices: Record<string, number>;
  overrideUnits: Record<string, string>;
  overrideNames: Record<string, string>;
  overrideCatNames: Record<string, string>;
  overrideItemCats: Record<string, string>;
  hiddenItems: string[];
  hiddenCategories: string[];
}

const EMPTY: PricerSettings = {
  customItems: [],
  customCategories: [],
  overridePrices: {},
  overrideUnits: {},
  overrideNames: {},
  overrideCatNames: {},
  overrideItemCats: {},
  hiddenItems: [],
  hiddenCategories: [],
};

export async function loadPricerSettings(): Promise<PricerSettings> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return EMPTY;
    const { data } = await supabase
      .from("pricer_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (!data) return EMPTY;
    return {
      customItems:        Array.isArray(data.custom_items)       ? data.custom_items       : [],
      customCategories:   Array.isArray(data.custom_categories)  ? data.custom_categories  : [],
      overridePrices:     data.override_prices     ?? {},
      overrideUnits:      data.override_units      ?? {},
      overrideNames:      data.override_names      ?? {},
      overrideCatNames:   data.override_cat_names  ?? {},
      overrideItemCats:   data.override_item_cats  ?? {},
      hiddenItems:        Array.isArray(data.hidden_items)       ? data.hidden_items       : [],
      hiddenCategories:   Array.isArray(data.hidden_categories)  ? data.hidden_categories  : [],
    };
  } catch {
    return EMPTY;
  }
}

// Build the effective list of items the user should see in pickers.
// Applies: custom_items, override_prices/units/names/categories, hidden_items, hidden_categories.
export function buildEffectivePriceList(settings: PricerSettings): PriceItem[] {
  const all = [...PRICE_LIST, ...settings.customItems];
  const hiddenItems = new Set(settings.hiddenItems);
  const hiddenCats = new Set(settings.hiddenCategories);
  return all
    .map(p => {
      const cat = settings.overrideItemCats[p.id] ?? p.category;
      return {
        ...p,
        name:     settings.overrideNames[p.id]  ?? p.name,
        unit:     settings.overrideUnits[p.id]  ?? p.unit,
        price:    settings.overridePrices[p.id] ?? p.price,
        category: cat,
      };
    })
    .filter(p => !hiddenItems.has(p.id))
    .filter(p => !hiddenCats.has(p.category));
}

// Build the categories list to show in the picker chips.
// Applies: custom_categories, override_cat_names, hidden_categories.
// Only categories that actually have items in the effective list are returned.
export function buildEffectiveCategories(
  settings: PricerSettings,
  effectiveItems: PriceItem[],
): { key: string; label: string }[] {
  const usedCats = new Set<string>();
  effectiveItems.forEach(p => usedCats.add(p.category));
  const hiddenCats = new Set(settings.hiddenCategories);

  const allDefs: PriceCategory[] = [
    ...PRICE_CATEGORIES,
    ...settings.customCategories,
  ];

  const labelFor = (key: string) => {
    if (settings.overrideCatNames[key]) return settings.overrideCatNames[key];
    const c = allDefs.find(c => c.key === key);
    return c ? `${c.emoji} ${c.label}` : key;
  };

  return [
    { key: "all", label: "📋 הכל" },
    ...Array.from(usedCats)
      .filter(k => !hiddenCats.has(k))
      .sort()
      .map(key => ({ key, label: labelFor(key) })),
  ];
}
