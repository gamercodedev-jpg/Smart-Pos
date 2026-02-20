// src/components/variance/ActualUsageInput.tsx
import { Ingredient } from '@/types/variance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ActualUsageInputProps {
  ingredients: Ingredient[];
  onUpdate: (ingredientId: string, quantity: number) => void;
}

const ActualUsageInput = ({ ingredients, onUpdate }: ActualUsageInputProps) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    ingredients.forEach(ing => {
      const quantity = formData.get(ing.id) as string;
      if (quantity) {
        onUpdate(ing.id, parseFloat(quantity));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manager's Physical Count</CardTitle>
        <CardDescription>Input the actual usage from the physical stock count.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {ingredients.map(ingredient => (
            <div key={ingredient.id} className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={ingredient.id}>{ingredient.name}</Label>
              <Input
                id={ingredient.id}
                name={ingredient.id}
                type="number"
                step="0.01"
                placeholder={`Usage in ${ingredient.unit}`}
                className="col-span-2"
              />
            </div>
          ))}
          <Button type="submit" className="w-full">Update Actual Usage</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ActualUsageInput;
