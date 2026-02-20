// src/hooks/useProfitProtection.ts
import { useState, useMemo } from 'react';
import {
  Sale,
  MenuItem,
  Ingredient,
  TheoreticalUsage,
  ActualUsage,
  LossLeaderReport,
} from '@/types/variance';

export const useProfitProtection = (
  sales: Sale[],
  menuItems: MenuItem[],
  ingredients: Ingredient[]
) => {
  const [actualUsage, setActualUsage] = useState<ActualUsage>({});

  const theoreticalUsage = useMemo((): TheoreticalUsage => {
    const usage: TheoreticalUsage = {};

    sales.forEach(sale => {
      const menuItem = menuItems.find(mi => mi.id === sale.menuItemId);
      if (menuItem) {
        menuItem.recipe.forEach(component => {
          const totalQuantity = component.quantity * sale.quantitySold;
          usage[component.ingredientId] = (usage[component.ingredientId] || 0) + totalQuantity;
        });
      }
    });

    return usage;
  }, [sales, menuItems]);

  const lossLeaderReport = useMemo((): LossLeaderReport => {
    const report: LossLeaderReport = [];

    ingredients.forEach(ingredient => {
      const theoretical = theoreticalUsage[ingredient.id] || 0;
      const actual = actualUsage[ingredient.id] || 0;
      const variance = actual - theoretical;
      const financialLoss = variance * ingredient.costPerUnit;

      // Only include items with a loss in the report
      if (financialLoss > 0) {
        report.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          theoretical,
          actual,
          variance,
          financialLoss,
          unit: ingredient.unit,
        });
      }
    });

    // Sort by the highest financial loss
    return report.sort((a, b) => b.financialLoss - a.financialLoss);
  }, [ingredients, theoreticalUsage, actualUsage]);

  const updateActualUsage = (ingredientId: string, quantity: number) => {
    setActualUsage(prev => ({
      ...prev,
      [ingredientId]: quantity,
    }));
  };

  return {
    theoreticalUsage,
    actualUsage,
    lossLeaderReport,
    updateActualUsage,
  };
};
