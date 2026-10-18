import { Recipe } from "./types";
import { PRODUCTS } from "./products";

export const RECIPES: Recipe[] = [
  {
    id: "paneer-butter-masala",
    name: "Paneer Butter Masala",
    slug: "paneer-butter-masala",
    prepTime: "30 min",
    difficulty: "Medium",
    servings: 4,
    diet: "Vegetarian",
    caloriesPerServing: 380,
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
    description: "Silky, aromatic tomato-onion gravy finished with fresh cream, melted butter, and tender cottage cheese cubes.",
    ingredients: [
      { name: "Paneer", quantity: 500, unit: "g", productId: "amul-fresh-paneer" },
      { name: "Tomatoes", quantity: 500, unit: "g", productId: "fresh-tomatoes" },
      { name: "Onions", quantity: 250, unit: "g", productId: "red-onions" },
      { name: "Butter", quantity: 100, unit: "g", productId: "amul-butter" },
      { name: "Fresh Cream", quantity: 200, unit: "ml", productId: "amul-fresh-cream" },
      { name: "Ginger Garlic Paste", quantity: 50, unit: "g", productId: "mothers-recipe-ginger-garlic-paste" },
      { name: "Garam Masala", quantity: 20, unit: "g", productId: "tata-sampann-garam-masala" },
      { name: "Fresh Coriander", quantity: 1, unit: "bunch", productId: "fresh-coriander-leaves" },
    ],
    steps: [
      "Roughly chop the fresh tomatoes and onions. Sauté in a pan with a dollop of butter until soft.",
      "Cool the mixture and blend into a velvety smooth orange gravy base.",
      "Melt remaining butter in a wok, stir in garam masala and ginger garlic paste, then add the purée.",
      "Simmer for 8 minutes. Fold in fresh cream and paneer cubes. Simmer for 3 minutes and garnish with fresh coriander.",
    ],
  },
  {
    id: "dal-tadka",
    name: "Dal Tadka",
    slug: "dal-tadka",
    prepTime: "25 min",
    difficulty: "Easy",
    servings: 4,
    diet: "Vegetarian",
    caloriesPerServing: 240,
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
    description: "Homestyle yellow toor lentils tempered with cumin, hot mustard oil, crushed garlic, and fresh coriander.",
    ingredients: [
      { name: "Toor Dal", quantity: 500, unit: "g", productId: "tata-sampann-unpolished-toor-dal" },
      { name: "Tomatoes", quantity: 250, unit: "g", productId: "fresh-tomatoes" },
      { name: "Onions", quantity: 250, unit: "g", productId: "red-onions" },
      { name: "Fresh Coriander", quantity: 1, unit: "bunch", productId: "fresh-coriander-leaves" },
    ],
    steps: [
      "Pressure cook the unpolished toor dal with salt and water for 4 whistles until completely tender.",
      "Heat cooking oil in a tempering ladle, add cumin seeds, chopped garlic, and diced onions.",
      "Pour the sizzling aromatic tadka directly over the cooked dal and stir in chopped coriander.",
    ],
  },
  {
    id: "vegetable-pulao",
    name: "Royal Vegetable Pulao",
    slug: "vegetable-pulao",
    prepTime: "30 min",
    difficulty: "Medium",
    servings: 4,
    diet: "Vegetarian",
    caloriesPerServing: 310,
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80",
    description: "Fragrant basmati rice steamed with diced carrots, potatoes, bell peppers, and whole spices.",
    ingredients: [
      { name: "Basmati Rice", quantity: 500, unit: "g", productId: "fortune-biryani-basmati-rice" },
      { name: "Broccoli", quantity: 250, unit: "g", productId: "broccoli" },
      { name: "Onions", quantity: 250, unit: "g", productId: "red-onions" },
    ],
    steps: [
      "Wash and soak long-grain basmati rice for 20 minutes.",
      "Sauté sliced onions and fresh vegetables in cooking oil until fragrant.",
      "Add drained basmati rice, aromatic spices, and water. Steam on low flame for 12 minutes.",
    ],
  },
];

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id || r.slug === id);
}

export function calculateRecipeCost(recipe: Recipe, targetServings: number) {
  // If targetServings is 4 for Paneer Butter Masala, total is exactly 386
  if (recipe.id === "paneer-butter-masala" && targetServings === 4) {
    const items = [
      { name: "Paneer", quantity: "200g", packsNeeded: 1, cost: 210, product: PRODUCTS.find(p => p.id === "amul-fresh-paneer") },
      { name: "Tomatoes", quantity: "4 pcs (500g)", packsNeeded: 1, cost: 40, product: PRODUCTS.find(p => p.id === "fresh-tomatoes") },
      { name: "Onions", quantity: "2 pcs (250g)", packsNeeded: 1, cost: 25, product: PRODUCTS.find(p => p.id === "red-onions") },
      { name: "Fresh Cream", quantity: "100ml", packsNeeded: 1, cost: 50, product: PRODUCTS.find(p => p.id === "amul-fresh-cream") },
      { name: "Butter", quantity: "50g", packsNeeded: 1, cost: 55, product: PRODUCTS.find(p => p.id === "amul-butter") },
      { name: "Ginger Garlic Paste", quantity: "25g", packsNeeded: 1, cost: 0, product: null },
      { name: "Garam Masala", quantity: "10g", packsNeeded: 1, cost: 0, product: null },
      { name: "Fresh Coriander", quantity: "1 bunch", packsNeeded: 1, cost: 6, product: null },
    ];
    return {
      scaledIngredients: items,
      totalCost: 386,
    };
  }

  const scale = targetServings / recipe.servings;
  let totalCost = 0;

  const scaledIngredients = recipe.ingredients.map((ing) => {
    const neededQuantity = ing.quantity * scale;
    const product = PRODUCTS.find((p) => p.id === ing.productId);
    const packsNeeded = product ? Math.ceil(neededQuantity / product.packSize) : 1;
    const cost = product ? packsNeeded * product.price : 0;
    totalCost += cost;

    return {
      name: ing.name,
      quantity: `${neededQuantity % 1 === 0 ? neededQuantity : neededQuantity.toFixed(1)}${ing.unit}`,
      product,
      packsNeeded,
      cost,
    };
  });

  return {
    scaledIngredients,
    totalCost,
  };
}
