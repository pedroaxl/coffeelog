import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Alerts, Coffee, ConsumeResult, Recipe, Settings, TempState } from "./types";

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

// ---- Storage units (portion / consume / state) ----

function useCoffeeCacheSync() {
  const qc = useQueryClient();
  return (coffee: Coffee) => {
    qc.setQueryData(["coffee", coffee.id], coffee);
    qc.invalidateQueries({ queryKey: ["coffees"] });
    qc.invalidateQueries({ queryKey: ["alerts"] });
    qc.invalidateQueries({ queryKey: ["unit"] });
  };
}

export interface PortionInput {
  tubes: { weightG: number }[];
  tubeState: TempState;
}

export function usePortion(unitId: number) {
  const sync = useCoffeeCacheSync();
  return useMutation({
    mutationFn: (input: PortionInput) => api.post<Coffee>(`/units/${unitId}/portion`, input),
    onSuccess: sync,
  });
}

export function useSetUnitState(unitId: number) {
  const sync = useCoffeeCacheSync();
  return useMutation({
    mutationFn: (patch: { sealState?: "sealed" | "open"; tempState?: TempState }) =>
      api.patch<Coffee>(`/units/${unitId}`, patch),
    onSuccess: sync,
  });
}

export function useConsume(unitId: number) {
  const sync = useCoffeeCacheSync();
  return useMutation({
    mutationFn: (input: { grams?: number; note?: string | null }) =>
      api.post<ConsumeResult>(`/units/${unitId}/consume`, input),
    onSuccess: (res) => sync(res.coffee),
  });
}

export function useUndoConsume() {
  const sync = useCoffeeCacheSync();
  return useMutation({
    mutationFn: (logId: number) => api.post<Coffee>(`/consume/${logId}/undo`),
    onSuccess: sync,
  });
}

export interface UnitDetail {
  coffee: Coffee;
  unit: Coffee["units"][number];
}

export function useUnit(unitId: number | undefined) {
  return useQuery({
    queryKey: ["unit", unitId],
    queryFn: () => api.get<UnitDetail>(`/units/${unitId}`),
    enabled: unitId != null && !Number.isNaN(unitId),
  });
}

export function useAlerts() {
  return useQuery({ queryKey: ["alerts"], queryFn: () => api.get<Alerts>("/alerts") });
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
