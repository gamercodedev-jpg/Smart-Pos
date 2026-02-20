export type POSModifierGroup = {
  id: string;
  name: string;
  options: string[];
};

export const posModifierGroups: POSModifierGroup[] = [
  {
    id: 'cook-level',
    name: 'Cook Level',
    options: ['Rare', 'Medium', 'Well Done'],
  },
  {
    id: 'extras',
    name: 'Extras',
    options: ['+ Cheese', '+ Egg', '+ Bacon', '+ Extra Sauce'],
  },
  {
    id: 'sides-choice',
    name: 'Side Choice',
    options: ['Chips', 'Rice', 'Nshima'],
  },
  {
    id: 'drink-ice',
    name: 'Drink',
    options: ['No Ice', 'Extra Ice'],
  },
];

export const getModifierGroup = (groupId: string) =>
  posModifierGroups.find(g => g.id === groupId) ?? null;
