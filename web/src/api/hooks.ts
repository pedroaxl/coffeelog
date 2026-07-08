import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Coffee, Recipe, Settings } from "./types";

// ---- Coffees ----

export interface CoffeeInput {
  name: string;
  roaster?: string | null;
  variety?: string | null;
  process?: string | null;
  beanRegion?: string | null;
  beanCountry?: string | null;
  roasteryName?: string | null;
  roasteryCountry?: string | null;
  altitudeM?: number | null;
  roastLevel?: string | null;
  roastDate?: string | null;
  purchaseDate?: string | null;
  score?: number | null;
  tastingNotes?: string[];
  recipe?: Partial<Omit<Recipe, "id" | "ratio">>;
  initialUnit?: { weightG: number; initialState: "sealed" | "open" | "frozen" };
}

export function useCoffees() {
  return useQuery({ queryKey: ["coffees"], queryFn: () => api.get<Coffee[]>("/coffees") });
}

export function useCoffee(id: number | undefined) {
  return useQuery({
    queryKey: ["coffee", id],
    queryFn: () => api.get<Coffee>(`/coffees/${id}`),
    enabled: id != null && !Number.isNaN(id),
  });
}

function useInvalidateCoffees() {
  const qc = useQueryClient();
  return (coffee?: Coffee) => {
    qc.invalidateQueries({ queryKey: ["coffees"] });
    if (coffee) qc.setQueryData(["coffee", coffee.id], coffee);
  };
}

export function useCreateCoffee() {
  const invalidate = useInvalidateCoffees();
  return useMutation({
    mutationFn: (input: CoffeeInput) => api.post<Coffee>("/coffees", input),
    onSuccess: invalidate,
  });
}

export function useUpdateCoffee(id: number) {
  const invalidate = useInvalidateCoffees();
  return useMutation({
    mutationFn: (patch: Partial<CoffeeInput>) => api.patch<Coffee>(`/coffees/${id}`, patch),
    onSuccess: invalidate,
  });
}

export function usePatchScore(id: number) {
  const invalidate = useInvalidateCoffees();
  return useMutation({
    mutationFn: (score: number | null) => api.patch<Coffee>(`/coffees/${id}/score`, { score }),
    onSuccess: invalidate,
  });
}

export function usePutRecipe(id: number) {
  const invalidate = useInvalidateCoffees();
  return useMutation({
    mutationFn: (recipe: Partial<Omit<Recipe, "id" | "ratio">>) =>
      api.put<Coffee>(`/coffees/${id}/recipe`, recipe),
    onSuccess: invalidate,
  });
}

export function useUploadPhoto(id: number) {
  const invalidate = useInvalidateCoffees();
  return useMutation({
    mutationFn: (file: File) => api.upload<Coffee>(`/coffees/${id}/photo`, file),
    onSuccess: invalidate,
  });
}

export function useDeleteCoffee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del<void>(`/coffees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coffees"] }),
  });
}

// ---- Settings ----

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<Settings>("/settings"),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Settings>) => api.patch<Settings>("/settings", patch),
    onSuccess: (data) => qc.setQueryData(["settings"], data),
  });
}
