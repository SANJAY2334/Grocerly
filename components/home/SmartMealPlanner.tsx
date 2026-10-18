"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  Plus,
  Minus,
  ShoppingBag,
  ChefHat,
  Check,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { RECIPES } from "@/lib/recipes";
import { calculateMealPlan } from "@/lib/meal-planner";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export function SmartMealPlanner() {
  // Support multi-recipe weekly meal planning
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([
    "paneer-butter-masala",
  ]);
  const [servingsMap, setServingsMap] = useState<Record<string, number>>({
    "paneer-butter-masala": 4,
  });
  const [activePreviewId, setActivePreviewId] = useState<string>("paneer-butter-masala");
  const [nlQuery, setNlQuery] = useState<string>("");
  const [addedAllAnimation, setAddedAllAnimation] = useState<boolean>(false);

  const {
    catalogue,
    addToCart,
    openCartDrawer,
    addToast,
    pantryItems,
    togglePantryItem,
    isInPantry,
  } = useStore();

  const selections = selectedRecipeIds.map((id) => ({
    recipeId: id,
    servings: servingsMap[id] || 4,
  }));

  const planResult = calculateMealPlan(selections, {
    pantryProductIds: pantryItems,
    productsCatalogue: catalogue,
    recipesCatalogue: RECIPES,
  });

  const activeRecipe =
    RECIPES.find((r) => r.id === activePreviewId) ||
    RECIPES.find((r) => r.id === selectedRecipeIds[0]) ||
    RECIPES[0];

  const handleToggleRecipe = (recipeId: string) => {
    setActivePreviewId(recipeId);
    if (selectedRecipeIds.includes(recipeId)) {
      if (selectedRecipeIds.length > 1) {
        setSelectedRecipeIds(selectedRecipeIds.filter((id) => id !== recipeId));
      }
    } else {
      setSelectedRecipeIds([...selectedRecipeIds, recipeId]);
      if (!servingsMap[recipeId]) {
        setServingsMap({ ...servingsMap, [recipeId]: 4 });
      }
    }
  };

  const handleUpdateServings = (recipeId: string, delta: number) => {
    const current = servingsMap[recipeId] || 4;
    const updated = Math.min(24, Math.max(1, current + delta));
    setServingsMap({ ...servingsMap, [recipeId]: updated });
  };

  const handleNLSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = nlQuery.toLowerCase();
    if (!query) return;

    const matched = RECIPES.find((r) => {
      const name = r.name.toLowerCase();
      const keywords = r.id.split("-");
      return name.includes(query) || keywords.some((k) => query.includes(k));
    });

    if (matched) {
      if (!selectedRecipeIds.includes(matched.id)) {
        setSelectedRecipeIds([matched.id]);
      }
      setActivePreviewId(matched.id);

      const servingsMatch = query.match(/(\d+)\s*(people|person|servings|portions)?/);
      if (servingsMatch && servingsMatch[1]) {
        const parsed = parseInt(servingsMatch[1], 10);
        if (parsed >= 1 && parsed <= 24) {
          setServingsMap({ ...servingsMap, [matched.id]: parsed });
        }
      }
    }
  };

  const handleAddAllToCart = () => {
    let countAdded = 0;
    planResult.ingredients.forEach((item) => {
      if (!item.inPantry && item.mappedProduct && item.packsAllocated > 0) {
        addToCart(item.mappedProduct.id, item.packsAllocated, false);
        countAdded += 1;
      }
    });

    addToast({
      type: "cart",
      title: "Meal Plan Ingredients Added!",
      message: `${countAdded} items (${formatCurrency(planResult.totalBasketCost)}) added to cart.`,
      action: {
        label: "View Cart",
        onClick: () => openCartDrawer(),
      },
    });

    setAddedAllAnimation(true);
    setTimeout(() => {
      setAddedAllAnimation(false);
      openCartDrawer();
    }, 600);
  };

  return (
    <section id="planner" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#163C29]/10 text-[#163C29] text-xs font-bold uppercase tracking-wider mb-2">
          <ChefHat className="w-3.5 h-3.5" />
          Multi-Recipe Smart Meal Planner
        </div>
        <h2 className="font-heading font-black text-3xl sm:text-4xl text-ink tracking-tight">
          What are you cooking this week?
        </h2>
        <p className="text-xs sm:text-sm text-ink-muted mt-1.5">
          Select recipes to build your weekly plan. We aggregate duplicate ingredients, deduct items in your pantry, alert on inventory shortages, and compute your exact grocery cost.
        </p>

        {/* Natural Language Search Input */}
        <form
          onSubmit={handleNLSearch}
          className="mt-5 flex items-center bg-white p-2 rounded-2xl border border-[rgba(22,60,41,0.1)] shadow-xs max-w-lg mx-auto"
        >
          <Sparkles className="w-4 h-4 text-[#163C29] ml-2 shrink-0" />
          <input
            type="text"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            placeholder="e.g. paneer butter masala for 4 people"
            className="w-full px-3 py-1.5 text-xs bg-transparent text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#163C29] hover:bg-[#1f5238] text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            Match Plan
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-ink-muted">
          <span>Try:</span>
          <button
            type="button"
            onClick={() => {
              setSelectedRecipeIds(["paneer-butter-masala"]);
              setServingsMap({ "paneer-butter-masala": 4 });
              setActivePreviewId("paneer-butter-masala");
              setNlQuery("paneer butter masala for 4 people");
            }}
            className="hover:text-forest underline cursor-pointer"
          >
            &quot;paneer butter masala for 4&quot;
          </button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => {
              setSelectedRecipeIds(["paneer-butter-masala", "dal-tadka"]);
              setServingsMap({ "paneer-butter-masala": 4, "dal-tadka": 4 });
              setActivePreviewId("dal-tadka");
              setNlQuery("Combine Paneer Butter Masala & Dal Tadka");
            }}
            className="hover:text-forest underline cursor-pointer"
          >
            &quot;combine paneer + dal tadka (Weekly)&quot;
          </button>
        </div>
      </div>

      {/* Recipe Selection Chips (Multi-Selectable) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6 justify-center">
        {RECIPES.map((recipe) => {
          const isSelected = selectedRecipeIds.includes(recipe.id);
          const isPreviewing = activePreviewId === recipe.id;
          return (
            <button
              key={recipe.id}
              type="button"
              onClick={() => handleToggleRecipe(recipe.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? "bg-[#163C29] text-white border-[#163C29] shadow-xs"
                  : "bg-white text-ink-muted hover:text-ink border-[rgba(22,60,41,0.08)] hover:bg-[#F8F7F2]"
              } ${isPreviewing ? "ring-2 ring-[#C8E27A]" : ""}`}
            >
              <span>{isSelected ? "✓ " : ""}{recipe.name}</span>
              <span className="opacity-75 text-[10px]">({recipe.prepTime})</span>
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Interactive Workspace */}
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] shadow-xs p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Recipe Preview & Preparation */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-[#F8F7F2] shadow-2xs border border-[rgba(22,60,41,0.04)]">
              <Image
                src={activeRecipe.image}
                alt={activeRecipe.name}
                fill
                className="object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="bg-white/90 backdrop-blur-sm text-[#163C29] font-bold text-[10px] px-2.5 py-1 rounded-full border border-[rgba(22,60,41,0.08)]">
                  {activeRecipe.diet}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm p-2.5 rounded-xl border border-[rgba(22,60,41,0.08)] flex items-center justify-between text-xs font-bold text-ink">
                <span>⏱ {activeRecipe.prepTime}</span>
                <span>🔥 {activeRecipe.difficulty}</span>
                <span>⚡ {activeRecipe.caloriesPerServing} kcal</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-extrabold text-xl text-ink">
                  {activeRecipe.name}
                </h3>
                {/* Servings Stepper for active previewed recipe */}
                <div className="flex items-center gap-1.5 bg-[#F8F7F2] px-2.5 py-1 rounded-full border border-[rgba(22,60,41,0.08)]">
                  <span className="text-[11px] font-bold text-ink-muted">Servings:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateServings(activeRecipe.id, -1)}
                    className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold border border-black/5"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-xs text-forest w-4 text-center">
                    {servingsMap[activeRecipe.id] || 4}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateServings(activeRecipe.id, 1)}
                    className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold border border-black/5"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed mt-1 mb-3">
                {activeRecipe.description}
              </p>

              {/* Cooking Steps */}
              <div className="space-y-1.5 pt-2 border-t border-[rgba(22,60,41,0.08)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest block mb-1">
                  Preparation Guide
                </span>
                {activeRecipe.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-ink-muted leading-relaxed"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#F8F7F2] font-heading font-black text-forest flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Consolidated Ingredients Basket & Pantry Checklists */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
            <div>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(22,60,41,0.08)]">
                <div>
                  <h4 className="font-heading font-extrabold text-base text-ink">
                    CONSOLIDATED MEAL INGREDIENTS
                  </h4>
                  <p className="text-xs text-ink-muted">
                    {planResult.ingredients.length} items across {selectedRecipeIds.length}{" "}
                    {selectedRecipeIds.length === 1 ? "recipe" : "recipes"}. Check pantry items to exclude them from your purchase.
                  </p>
                </div>

                {planResult.pantrySavings > 0 && (
                  <span className="text-[11px] font-bold text-emerald-800 bg-[#E5F3D6] px-3 py-1 rounded-full">
                    Pantry Savings: {formatCurrency(planResult.pantrySavings)}
                  </span>
                )}
              </div>

              {/* Shortfall Warnings Banner if any items lack inventory */}
              {planResult.hasShortfalls && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Some ingredients have limited inventory. We capped quantities at available stock or recommended substitutes below.
                  </span>
                </div>
              )}

              {/* Ingredients List with Pantry Checkbox & Duplicate Consolidation */}
              <div className="mt-3 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {planResult.ingredients.map((ing) => {
                  const inPantry = isInPantry(ing.productId);
                  return (
                    <div
                      key={ing.productId}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl border transition-all ${
                        inPantry
                          ? "bg-gray-50/70 border-gray-200 opacity-60"
                          : ing.hasShortfall
                          ? "bg-amber-50/40 border-amber-200"
                          : "bg-[#F8F7F2]/70 border-[rgba(22,60,41,0.05)]"
                      }`}
                    >
                      {/* Pantry Checkbox */}
                      <button
                        type="button"
                        onClick={() => togglePantryItem(ing.productId)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          inPantry
                            ? "bg-forest border-forest text-white"
                            : "bg-white border-gray-300 hover:border-forest"
                        }`}
                        title={inPantry ? "In pantry (excluded from buy list)" : "Mark as already in pantry"}
                      >
                        {inPantry && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      {/* Produce Thumbnail */}
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 border border-black/5">
                        {ing.mappedProduct ? (
                          <Image
                            src={ing.mappedProduct.image}
                            alt={ing.mappedProduct.name}
                            fill
                            className="object-contain p-1"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">🌿</div>
                        )}
                      </div>

                      {/* Ingredient Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-heading font-bold text-xs truncate ${inPantry ? "line-through text-ink-muted" : "text-ink"}`}>
                            {ing.ingredientName}
                          </span>
                          <span className="text-xs text-ink-muted shrink-0">
                            ({ing.totalRequiredQuantity} {ing.unit})
                          </span>
                        </div>

                        {/* Consolidation / Source recipe badge */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {ing.sourceRecipes.length > 1 && (
                            <span className="text-[10px] font-bold text-[#163C29] bg-[#C8E27A]/40 px-2 py-0.5 rounded-full">
                              Used in {ing.sourceRecipes.length} dishes
                            </span>
                          )}
                          {ing.hasShortfall && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              {ing.shortfallMessage}
                            </span>
                          )}
                          {inPantry ? (
                            <span className="text-[10px] text-ink-subtle">Already in pantry</span>
                          ) : ing.mappedProduct ? (
                            <span className="text-[10px] text-ink-muted">
                              {ing.packsAllocated} × {ing.mappedProduct.unit} pack @ {formatCurrency(ing.unitPrice)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-ink-subtle">Pantry staple</span>
                          )}
                        </div>

                        {/* Recommended Substitute if Shortfall */}
                        {ing.hasShortfall && ing.substitutes.length > 0 && !inPantry && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-ink-muted">
                            <span>Substitute:</span>
                            <button
                              type="button"
                              onClick={() => addToCart(ing.substitutes[0].id, 1)}
                              className="font-bold text-forest hover:underline"
                            >
                              + Add {ing.substitutes[0].name} ({formatCurrency(ing.substitutes[0].price)})
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Cost */}
                      <div className="text-right shrink-0">
                        <span className="font-heading font-black text-xs text-ink block">
                          {inPantry ? "₹0 (Pantry)" : formatCurrency(ing.lineCost)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Footer & 1-Click Action */}
            <div className="pt-4 border-t border-[rgba(22,60,41,0.08)] bg-[#F8F7F2] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="block text-[11px] font-medium text-ink-muted">
                  Required Produce to Buy ({planResult.totalItemsToBuy} items)
                </span>
                <span className="font-heading font-black text-2xl text-forest">
                  {formatCurrency(planResult.totalBasketCost)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddAllToCart}
                disabled={planResult.totalItemsToBuy === 0}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#163C29] hover:bg-[#1f5238] disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                {addedAllAnimation ? (
                  <>
                    <Check className="w-4 h-4 text-[#C8E27A]" /> Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Add Required to Cart &rarr;
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
