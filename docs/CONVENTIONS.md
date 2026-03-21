# SubLift — Conventions

## Language & Framework

- TypeScript strict mode (`"strict": true` in tsconfig)
- React 18 with functional components and hooks only (no class components)
- Vite as build tool

## Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files — components | PascalCase | `VesselEditor.tsx` |
| Files — utilities | camelCase | `interpolateCraneCurve.ts` |
| Files — stores | camelCase with `use` prefix | `useProjectStore.ts` |
| Files — types | camelCase | `vessel.types.ts` |
| Files — tests | same name + `.test` | `interpolateCraneCurve.test.ts` |
| Components | PascalCase | `<DeckLayoutCanvas />` |
| Functions | camelCase | `calculateCraneRadius()` |
| Variables | camelCase | `craneCapacity` |
| Constants | UPPER_SNAKE_CASE | `SEAWATER_DENSITY` |
| Types/Interfaces | PascalCase | `VesselData`, `CraneCurvePoint` |
| Enums | PascalCase (type + values) | `CraneType = "OMC" \| "knuckle_boom"` |
| Database columns | snake_case | `crane_pedestal_x` |
| Supabase tables | snake_case | `equipment_library` |
| CSS classes | Tailwind utilities only | `className="flex items-center gap-2"` |

## File Organization

- One component per file
- Component files include only the component and its local types/helpers
- Shared types go in `src/types/`
- Shared utilities go in `src/lib/`
- Store files go in `src/stores/`
- Test files live next to the file they test

## TypeScript Rules

- Never use `any`. Use `unknown` if type is truly unknown, then narrow.
- Prefer `type` over `interface` for consistency (use `interface` only for extending)
- All function parameters must be typed
- All return types must be explicit for exported functions
- Use Zod for runtime validation at data boundaries (Supabase responses, form inputs)
- Use discriminated unions for state: `{ status: "loading" } | { status: "ready", data: T } | { status: "error", error: string }`

## React Patterns

- State management: Zustand for global/shared state, `useState` for component-local state
- Side effects: `useEffect` for data fetching on mount, avoid complex effect chains
- Memoization: `useMemo` for expensive calculations, `useCallback` for event handlers passed to children. Don't over-memoize.
- Component size: keep under 200 lines. Extract sub-components or custom hooks if larger.
- Props: destructure in function signature. No spreading unknown props.

## Zustand Store Pattern

```typescript
// stores/useProjectStore.ts
import { create } from "zustand";

type ProjectState = {
  project: Project | null;
  isLoading: boolean;
  error: string | null;
  loadProject: (id: string) => Promise<void>;
  updateProject: (data: Partial<Project>) => void;
  saveProject: () => Promise<void>;
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  isLoading: false,
  error: null,
  loadProject: async (id) => {
    set({ isLoading: true, error: null });
    // ... Supabase fetch
  },
  updateProject: (data) => {
    set((state) => ({
      project: state.project ? { ...state.project, ...data } : null,
    }));
  },
  saveProject: async () => {
    // ... Supabase upsert
  },
}));
```

## Supabase Patterns

- All Supabase calls go through service functions in `src/lib/supabase/` (not directly in components)
- Service functions return typed data (never raw Supabase response in components)
- Error handling: try/catch in service, return `{ data, error }` pattern
- Batch inserts for bulk data (crane curve points, RAO entries, scatter diagram)

```typescript
// lib/supabase/vesselService.ts
export async function loadVessel(id: string): Promise<{ data: Vessel | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("vessel")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as Vessel, error: null };
  } catch (e) {
    return { data: null, error: "Network error" };
  }
}
```

## Calculation Functions

- All calculation functions are **pure**: no side effects, no state access, no Supabase calls
- Located in `src/lib/calculations/`
- Each function has JSDoc with: description, parameter descriptions, formula reference, units
- Physical constants defined in `src/lib/calculations/constants.ts`

```typescript
// lib/calculations/constants.ts
export const SEAWATER_DENSITY = 1025; // kg/m³
export const GRAVITY = 9.81; // m/s²

// lib/calculations/crane/interpolateCraneCurve.ts
/**
 * Interpolate crane capacity at a given radius using linear interpolation.
 * @param curvePoints - Sorted array of (radius_m, capacity_t) points
 * @param radius - Target radius in meters
 * @returns Capacity in tonnes, or 0 if radius is outside curve range
 */
export function interpolateCraneCurve(
  curvePoints: CraneCurvePoint[],
  radius: number
): number {
  // ...
}
```

## Testing

- Framework: Vitest
- **Mandatory** unit tests for all functions in `src/lib/calculations/`
- Test file naming: `functionName.test.ts` in the same directory
- Test structure: describe → it/test, using AAA (Arrange, Act, Assert)
- Use realistic engineering values in tests (not arbitrary numbers)
- Include edge cases: zero values, max values, out-of-range inputs

```typescript
// lib/calculations/crane/interpolateCraneCurve.test.ts
describe("interpolateCraneCurve", () => {
  const curve: CraneCurvePoint[] = [
    { radius_m: 10, capacity_t: 400 },
    { radius_m: 20, capacity_t: 250 },
    { radius_m: 30, capacity_t: 120 },
  ];

  test("interpolates between two points", () => {
    expect(interpolateCraneCurve(curve, 15)).toBeCloseTo(325);
  });

  test("returns exact value at a curve point", () => {
    expect(interpolateCraneCurve(curve, 10)).toBe(400);
  });

  test("returns 0 for radius beyond max", () => {
    expect(interpolateCraneCurve(curve, 35)).toBe(0);
  });

  test("returns 0 for radius below min", () => {
    expect(interpolateCraneCurve(curve, 5)).toBe(0);
  });
});
```

## Error Handling

- User-facing errors: toast notifications (shadcn Toast)
- Form validation: inline error messages below fields (Zod + react-hook-form)
- Supabase errors: caught in service layer, shown as toasts
- Calculation errors: return error objects, show inline near the result
- Never swallow errors silently — always log to console and show feedback

## Commits

- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Scope optional: `feat(vessel): add crane curve editor`
- One logical change per commit
- Tests included with the feature they test (same commit)

## Units

All internal values in SI:
- Length: meters (m)
- Weight/Mass: tonnes (t) — note: 1 tonne = 1000 kg
- Force: kilonewtons (kN) — for display of calculation results
- Angle: degrees (°) — stored as degrees, converted to radians internally for trigonometry
- Time: seconds (s)
- Area: square meters (m²)
- Volume: cubic meters (m³)
- Density: kg/m³
- Pressure: tonnes per square meter (t/m²) — for deck load

## Comments

- JSDoc on all exported functions
- Inline comments only for non-obvious engineering logic (reference the DNV clause)
- No commented-out code in committed files
- TODO comments are allowed during development, tracked in a single file if they accumulate
