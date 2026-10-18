import { Product, Recipe } from "./types";
import { PRODUCTS } from "./products";
import { RECIPES } from "./recipes";
import { toPaise, toRupees } from "./pricing";

export interface MealPlanSelection {
  recipeId: string;
  servings: number;
}

export interface AggregatedIngredientItem {
  productId: string;
  ingredientName: string;
  unit: string;
  totalRequiredQuantity: number; // Total scaled requirement across all selected recipes
  sourceRecipes: Array<{
    recipeId: string;
    recipeName: string;
    scaledQuantity: number;
  }>;
  inPantry: boolean;
  mappedProduct: Product | null;
  packSize: number;
  packsNeeded: number;
  availablePacks: number;
  packsAllocated: number;
  hasShortfall: boolean;
  shortfallQuantity: number;
  shortfallMessage: string | null;
  substitutes: Product[];
  unitPrice: number;
  lineCost: number;
}

export interface MealPlanCalculationResult {
  selections: Array<{
    recipe: Recipe;
    servings: number;
  }>;
  ingredients: AggregatedIngredientItem[];
  totalBasketCost: number;
  pantrySavings: number;
  totalItemsToBuy: number;
  hasShortfalls: boolean;
  hasUnmappedIngredients: boolean;
  warnings: string[];
}

/**
 * Find suitable available substitute products for a given product or ingredient.
 */
export function findSubstituteProducts(
  primaryProduct: Product | null,
  ingredientName: string,
  catalogue: Product[] = PRODUCTS
): Product[] {
  const lowerName = ingredientName.toLowerCase();
  return catalogue
    .filter((candidate) => {
      if (primaryProduct && candidate.id === primaryProduct.id) return false;
      if (candidate.stock <= 0) return false;
      if (primaryProduct && candidate.category === primaryProduct.category) return true;
      return (
        candidate.name.toLowerCase().includes(lowerName) ||
        candidate.tags.some((t) => t.toLowerCase().includes(lowerName))
      );
    })
    .slice(0, 3);
}

/**
 * Aggregate ingredients across one or more recipes (Weekly Meal Plan),
 * consolidate duplicate ingredients, apply pantry exclusions, check inventory shortfalls,
 * recommend substitutions, and calculate authoritative cost.
 */
export function calculateMealPlan(
  selections: MealPlanSelection[],
  options: {
    pantryProductIds?: string[];
    customQuantities?: Record<string, number>; // Optional user overrides for required packs
    productsCatalogue?: Product[];
    recipesCatalogue?: Recipe[];
  } = {}
): MealPlanCalculationResult {
  const productsCatalogue = options.productsCatalogue || PRODUCTS;
  const recipesCatalogue = options.recipesCatalogue || RECIPES;
  const pantrySet = new Set(options.pantryProductIds || []);
  const customQuantities = options.customQuantities || {};

  const resolvedSelections: Array<{ recipe: Recipe; servings: number }> = [];
  const aggregationMap = new Map<
    string,
    {
      productId: string;
      ingredientName: string;
      unit: string;
      totalRequiredQuantity: number;
      sourceRecipes: Array<{ recipeId: string; recipeName: string; scaledQuantity: number }>;
    }
  >();

  for (const sel of selections) {
    const recipe = recipesCatalogue.find((r) => r.id === sel.recipeId);
    if (!recipe) continue;

    const validServings = Math.max(1, Math.min(24, Math.round(sel.servings || recipe.servings)));
    resolvedSelections.push({ recipe, servings: validServings });

    const scaleFactor = validServings / recipe.servings;

    for (const ing of recipe.ingredients) {
      const scaledQty = Math.ceil(ing.quantity * scaleFactor);
      const key = ing.productId || `unmapped:${ing.name.toLowerCase()}`;

      const existing = aggregationMap.get(key);
      if (existing) {
        existing.totalRequiredQuantity += scaledQty;
        existing.sourceRecipes.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          scaledQuantity: scaledQty,
        });
      } else {
        aggregationMap.set(key, {
          productId: ing.productId,
          ingredientName: ing.name,
          unit: ing.unit,
          totalRequiredQuantity: scaledQty,
          sourceRecipes: [
            {
              recipeId: recipe.id,
              recipeName: recipe.name,
              scaledQuantity: scaledQty,
            },
          ],
        });
      }
    }
  }

  const ingredients: AggregatedIngredientItem[] = [];
  const warnings: string[] = [];
  let totalBasketCostPaise = 0;
  let pantrySavingsPaise = 0;
  let totalItemsToBuy = 0;
  let hasShortfalls = false;
  let hasUnmappedIngredients = false;

  for (const entry of Array.from(aggregationMap.values())) {
    const mappedProduct = productsCatalogue.find((p) => p.id === entry.productId) || null;
    const inPantry = pantrySet.has(entry.productId);

    if (!mappedProduct) {
      hasUnmappedIngredients = true;
      const substitutes = findSubstituteProducts(null, entry.ingredientName, productsCatalogue);
      const msg = `${entry.ingredientName} (${entry.totalRequiredQuantity} ${entry.unit}) is not mapped to an active catalogue SKU.`;
      warnings.push(msg);

      ingredients.push({
        productId: entry.productId,
        ingredientName: entry.ingredientName,
        unit: entry.unit,
        totalRequiredQuantity: entry.totalRequiredQuantity,
        sourceRecipes: entry.sourceRecipes,
        inPantry,
        mappedProduct: null,
        packSize: 1,
        packsNeeded: 1,
        availablePacks: 0,
        packsAllocated: 0,
        hasShortfall: true,
        shortfallQuantity: entry.totalRequiredQuantity,
        shortfallMessage: msg,
        substitutes,
        unitPrice: 0,
        lineCost: 0,
      });
      continue;
    }

    const packSize = mappedProduct.packSize > 0 ? mappedProduct.packSize : 1;
    const computedPacksNeeded = Math.max(1, Math.ceil(entry.totalRequiredQuantity / packSize));
    const packsNeeded =
      customQuantities[entry.productId] !== undefined
        ? Math.max(0, Math.round(customQuantities[entry.productId]))
        : computedPacksNeeded;

    const availablePacks = Math.max(0, mappedProduct.stock);
    const unitPricePaise = toPaise(mappedProduct.price);

    if (inPantry) {
      pantrySavingsPaise += unitPricePaise * packsNeeded;
      ingredients.push({
        productId: entry.productId,
        ingredientName: entry.ingredientName,
        unit: entry.unit,
        totalRequiredQuantity: entry.totalRequiredQuantity,
        sourceRecipes: entry.sourceRecipes,
        inPantry: true,
        mappedProduct,
        packSize,
        packsNeeded,
        availablePacks,
        packsAllocated: 0,
        hasShortfall: false,
        shortfallQuantity: 0,
        shortfallMessage: null,
        substitutes: [],
        unitPrice: mappedProduct.price,
        lineCost: 0,
      });
      continue;
    }

    const packsAllocated = Math.min(packsNeeded, availablePacks);
    const totalAvailableQuantity = availablePacks * packSize;
    const itemHasShortfall = packsAllocated < packsNeeded;

    let shortfallQuantity = 0;
    let shortfallMessage: string | null = null;
    let substitutes: Product[] = [];

    if (itemHasShortfall) {
      hasShortfalls = true;
      shortfallQuantity = Math.max(
        0,
        entry.totalRequiredQuantity - totalAvailableQuantity
      );
      substitutes = findSubstituteProducts(mappedProduct, entry.ingredientName, productsCatalogue);

      if (availablePacks === 0) {
        shortfallMessage = `${mappedProduct.name} is out of stock (requires ${entry.totalRequiredQuantity} ${entry.unit}).`;
      } else {
        shortfallMessage = `Requires ${entry.totalRequiredQuantity} ${entry.unit} (${packsNeeded} packs), but only ${totalAvailableQuantity} ${entry.unit} (${availablePacks} pack(s)) available. Shortfall: ${shortfallQuantity} ${entry.unit}.`;
      }
      warnings.push(shortfallMessage);
    }

    const lineCostPaise = unitPricePaise * packsAllocated;
    totalBasketCostPaise += lineCostPaise;
    totalItemsToBuy += packsAllocated;

    ingredients.push({
      productId: entry.productId,
      ingredientName: entry.ingredientName,
      unit: entry.unit,
      totalRequiredQuantity: entry.totalRequiredQuantity,
      sourceRecipes: entry.sourceRecipes,
      inPantry: false,
      mappedProduct,
      packSize,
      packsNeeded,
      availablePacks,
      packsAllocated,
      hasShortfall: itemHasShortfall,
      shortfallQuantity,
      shortfallMessage,
      substitutes,
      unitPrice: mappedProduct.price,
      lineCost: toRupees(lineCostPaise),
    });
  }

  return {
    selections: resolvedSelections,
    ingredients,
    totalBasketCost: toRupees(totalBasketCostPaise),
    pantrySavings: toRupees(pantrySavingsPaise),
    totalItemsToBuy,
    hasShortfalls,
    hasUnmappedIngredients,
    warnings,
  };
}
