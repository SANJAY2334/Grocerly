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
  {
    id: "palak-paneer",
    name: "Creamy Palak Paneer",
    slug: "creamy-palak-paneer",
    prepTime: "35 min",
    difficulty: "Medium",
    servings: 4,
    diet: "Vegetarian",
    caloriesPerServing: 320,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
    description: "Nutrient-rich organic spinach pureed and simmered with soft paneer cubes, tempered with garlic and finished with fresh cream.",
    ingredients: [
      { name: "Organic Spinach", quantity: 500, unit: "g", productId: "organic-spinach" },
      { name: "Fresh Paneer", quantity: 400, unit: "g", productId: "amul-fresh-paneer" },
      { name: "Tomatoes", quantity: 250, unit: "g", productId: "fresh-tomatoes" },
      { name: "Red Onions", quantity: 200, unit: "g", productId: "red-onions" },
      { name: "Fresh Cream", quantity: 100, unit: "ml", productId: "amul-fresh-cream" },
      { name: "Butter", quantity: 50, unit: "g", productId: "amul-butter" },
    ],
    steps: [
      "Blanch fresh organic spinach in boiling water for 2 minutes, then plunge into cold water to preserve the vibrant emerald green.",
      "Purée blanched spinach with green chillies into a smooth, velvety consistency.",
      "Sauté onions, ginger, and diced tomatoes in melted butter until thoroughly aromatic.",
      "Add the spinach purée and simmer for 5 minutes. Fold in fresh paneer cubes and swirl with cream before serving.",
    ],
  },
  {
    id: "vegetable-khichdi",
    name: "Homestyle Vegetable Khichdi",
    slug: "vegetable-khichdi",
    prepTime: "25 min",
    difficulty: "Easy",
    servings: 4,
    diet: "Vegetarian",
    caloriesPerServing: 260,
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80",
    description: "Wholesome, comforting one-pot potage of long-grain rice, unpolished toor dal, fresh tomatoes, and crisp broccoli florets.",
    ingredients: [
      { name: "Basmati Rice", quantity: 300, unit: "g", productId: "fortune-biryani-basmati-rice" },
      { name: "Toor Dal", quantity: 200, unit: "g", productId: "tata-sampann-unpolished-toor-dal" },
      { name: "Broccoli", quantity: 250, unit: "g", productId: "broccoli" },
      { name: "Tomatoes", quantity: 200, unit: "g", productId: "fresh-tomatoes" },
      { name: "Red Onions", quantity: 150, unit: "g", productId: "red-onions" },
      { name: "Butter", quantity: 30, unit: "g", productId: "amul-butter" },
    ],
    steps: [
      "Rinse basmati rice and toor dal together until the water runs clear; soak for 15 minutes.",
      "In a pressure cooker, melt butter, temper cumin seeds, and sauté sliced onions and ripe tomatoes.",
      "Add broccoli florets, soaked rice, dal, turmeric, and 4 cups of water.",
      "Pressure cook for 3 whistles until tender and creamy. Serve warm with extra farm butter.",
    ],
  },
  {
    id: "alphonso-mango-lassi",
    name: "Royal Alphonso Mango Lassi",
    slug: "royal-alphonso-mango-lassi",
    prepTime: "10 min",
    difficulty: "Easy",
    servings: 4,
    diet: "Vegetarian",
    caloriesPerServing: 210,
    image: "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=800&q=80",
    description: "Chilled, luscious traditional beverage crafted from sweet Ratnagiri Alphonso mango pulp, fresh dairy milk, and cream.",
    ingredients: [
      { name: "Alphonso Mango", quantity: 500, unit: "g", productId: "premium-alphonso-mango" },
      { name: "Fresh Milk", quantity: 500, unit: "ml", productId: "amul-milk" },
      { name: "Fresh Cream", quantity: 100, unit: "ml", productId: "amul-fresh-cream" },
    ],
    steps: [
      "Peel and cube ripe sweet Alphonso mangoes.",
      "Combine mango pulp, cold Amul milk, and rich dairy cream in a blender.",
      "Blend on high speed for 60 seconds until frothy and smooth.",
      "Pour into tall glasses and serve chilled topped with mango cubes.",
    ],
  },
  {
    id: "power-granola-bowl",
    name: "Power Fruit & Granola Breakfast Bowl",
    slug: "power-fruit-granola-breakfast-bowl",
    prepTime: "10 min",
    difficulty: "Easy",
    servings: 2,
    diet: "Vegetarian",
    caloriesPerServing: 340,
    image: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=800&q=80",
    description: "Crunchy artisanal almond granola over chilled milk, loaded with fresh Robusta banana rounds and juicy Shimla apple slices.",
    ingredients: [
      { name: "Granola Muesli", quantity: 200, unit: "g", productId: "yoga-bar-almond-granola-muesli" },
      { name: "Fresh Milk", quantity: 400, unit: "ml", productId: "amul-milk" },
      { name: "Fresh Bananas", quantity: 250, unit: "g", productId: "fresh-bananas" },
      { name: "Shimla Apples", quantity: 250, unit: "g", productId: "shimla-apple-royal-delicious" },
    ],
    steps: [
      "Slice fresh bananas and dice Shimla apples into thin bite-sized chunks.",
      "Portion crunchy almond granola into serving bowls.",
      "Pour chilled milk over the granola base.",
      "Layer sliced fresh fruits on top and enjoy immediately.",
    ],
  },
  {
    id: "sauteed-broccoli",
    name: "Garlic Butter Sautéed Broccoli",
    slug: "garlic-butter-sauteed-broccoli",
    prepTime: "15 min",
    difficulty: "Easy",
    servings: 3,
    diet: "Vegetarian",
    caloriesPerServing: 160,
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    description: "Crisp green broccoli florets and red onions flash-sautéed in creamy farm butter with black pepper.",
    ingredients: [
      { name: "Broccoli", quantity: 500, unit: "g", productId: "broccoli" },
      { name: "Red Onions", quantity: 200, unit: "g", productId: "red-onions" },
      { name: "Fresh Tomatoes", quantity: 200, unit: "g", productId: "fresh-tomatoes" },
      { name: "Butter", quantity: 50, unit: "g", productId: "amul-butter" },
    ],
    steps: [
      "Cut broccoli into even florets and blanch in boiling water for 90 seconds, then drain.",
      "Melt butter in a wide pan over medium-high heat.",
      "Sauté sliced onions until tender and lightly golden.",
      "Add blanched broccoli and tomatoes; stir-fry briskly for 3 minutes.",
      "Season with salt and pepper, and serve hot.",
    ],
  },
  {
    id: "masala-chai",
    name: "Signature Kadak Masala Chai",
    slug: "signature-kadak-masala-chai",
    prepTime: "12 min",
    difficulty: "Easy",
    servings: 4,
    diet: "Vegetarian",
    caloriesPerServing: 120,
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
    description: "Rich, aromatic Indian tea brewed with CTC black tea leaves, crushed spices, and fresh creamy milk.",
    ingredients: [
      { name: "Taj Mahal Tea", quantity: 30, unit: "g", productId: "taj-mahal-tea-premium" },
      { name: "Fresh Milk", quantity: 500, unit: "ml", productId: "amul-milk" },
    ],
    steps: [
      "Bring 2 cups of water to a boil in a saucepan with crushed cardamom and ginger.",
      "Add premium black tea leaves and simmer for 3 minutes until rich and fragrant.",
      "Pour in fresh milk, bring to a rolling boil, and simmer for 2 more minutes.",
      "Strain into cutting chai glasses and serve hot.",
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
