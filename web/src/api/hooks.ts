import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Alerts,
  Brew,
  BrewInput,
  Coffee,
  ConsumeResult,
  Recipe,
  RecipeInput,
  RecipeKind,
  Settings,
  TempState,
} from "./types";

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
  recipe?: RecipeInput;
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
    qc.invalidateQueries({ queryKey: ["recipeVersions"] });
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

/**
 * Save the recipe. PATCH edits the current version while it is still a draft and
 * forks a new one once a brew points at it, so the editor never has to decide
 * which it is — read `coffee.recipe.version` from the response to find out.
 */
export function usePatchRecipe(id: number) {
  const invalidate = useInvalidateCoffees();
  return useMutation({
    mutationFn: (recipe: RecipeInput) => api.patch<Coffee>(`/coffees/${id}/recipe`, recipe),
    onSuccess: invalidate,
  });
}

/** Full recipe history for a coffee, newest first. */
export function useRecipeVersions(id: number | undefined) {
  return useQuery({
    queryKey: ["recipeVersions", id],
    queryFn: () => api.get<Recipe[]>(`/coffees/${id}/recipe/versions`),
    enabled: id != null && !Number.isNaN(id),
  });
}

export function useUploadPhotos() {
  const invalidate = useInvalidateCoffees();
  return useMutation({
    // id is passed at call time — binding it at hook-creation risked a stale 0
    // during the create-then-upload flow in the new-coffee wizard.
    mutationFn: ({ id, files }: { id: number; files: File | File[] }) =>
      api.upload<Coffee>(`/coffees/${id}/photos`, files),
    onSuccess: invalidate,
  });
}

export function useDeletePhoto() {
  const invalidate = useInvalidateCoffees();
  return useMutation({
    mutationFn: ({ id, path }: { id: number; path: string }) =>
      api.del<Coffee>(`/coffees/${id}/photos`, { path }),
    onSuccess: invalidate,
  });
}

export function useSetPrimaryPhoto() {
  const invalidate = useInvalidateCoffees();
  return useMutation({
    mutationFn: ({ id, path }: { id: number; path: string }) =>
      api.patch<Coffee>(`/coffees/${id}/photos/primary`, { path }),
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
    qc.invalidateQueries({ queryKey: ["brews"] });
    qc.invalidateQueries({ queryKey: ["recipeVersions"] });
  };
}

/** Add another bag to an existing coffee (e.g. a second bag of the same purchase). */
export function useAddBag(coffeeId: number) {
  const sync = useCoffeeCacheSync();
  return useMutation({
    mutationFn: (input: { weightG: number; initialState: "sealed" | "open" | "frozen" }) =>
      api.post<Coffee>(`/coffees/${coffeeId}/units`, { kind: "bag", ...input }),
    onSuccess: sync,
  });
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
    mutationFn: (patch: {
      sealState?: "sealed" | "open";
      tempState?: TempState;
      frozenDate?: string | null;
      openedDate?: string | null;
    }) => api.patch<Coffee>(`/units/${unitId}`, patch),
    onSuccess: sync,
  });
}

export function useConsume(unitId: number) {
  const sync = useCoffeeCacheSync();
  return useMutation({
    // A brew sent along is recorded with the consume and undone with it.
    mutationFn: (input: { grams?: number; note?: string | null; brew?: BrewInput }) =>
      api.post<ConsumeResult>(`/units/${unitId}/consume`, input),
    onSuccess: (res) => sync(res.coffee),
  });
}

// ---- Brews ----

export function useBrews(coffeeId: number | undefined) {
  return useQuery({
    queryKey: ["brews", coffeeId],
    queryFn: () => api.get<Brew[]>(`/coffees/${coffeeId}/brews`),
    enabled: coffeeId != null && !Number.isNaN(coffeeId),
  });
}

export function useBrew(brewId: number | undefined) {
  return useQuery({
    queryKey: ["brew", brewId],
    queryFn: () => api.get<Brew>(`/brews/${brewId}`),
    enabled: brewId != null && !Number.isNaN(brewId),
  });
}

/** Log a brew on its own — the stock ledger is left alone. */
export function useLogBrew() {
  const sync = useCoffeeCacheSync();
  return useMutation({
    // The coffee id is passed at call time so screens can create the mutation
    // before their data has loaded.
    mutationFn: ({ coffeeId, brew }: { coffeeId: number; brew: BrewInput }) =>
      api.post<{ brew: Brew; coffee: Coffee }>(`/coffees/${coffeeId}/brews`, brew),
    onSuccess: (res) => sync(res.coffee),
  });
}

export function usePatchBrew(brewId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: BrewInput) => api.patch<Brew>(`/brews/${brewId}`, patch),
    onSuccess: (brew) => {
      qc.setQueryData(["brew", brew.id], brew);
      qc.invalidateQueries({ queryKey: ["brews"] });
      qc.invalidateQueries({ queryKey: ["coffee", brew.coffeeId] });
    },
  });
}

export function useDeleteBrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (brewId: number) => api.del<void>(`/brews/${brewId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brews"] });
      qc.invalidateQueries({ queryKey: ["coffees"] });
      qc.invalidateQueries({ queryKey: ["coffee"] });
    },
  });
}

/** Turn what happened into the plan: a new recipe version from this brew. */
export function usePromoteBrew(brewId: number) {
  const sync = useCoffeeCacheSync();
  return useMutation({
    mutationFn: (opts: { changeNote?: string | null; kind?: RecipeKind }) =>
      api.post<{ recipeVersion: Recipe; coffee: Coffee }>(`/brews/${brewId}/promote`, opts),
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
