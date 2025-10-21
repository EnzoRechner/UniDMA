// This file contains constants and types used across the booking system application.
// It helps maintain consistency and avoid magic numbers/strings in the codebase.
export const STATUS_MAP: { [key: number]: string } = {
  0: 'pending',
  1: 'confirmed',
  2: 'rejected',
  3: 'cancelled',
  4: 'completed',
  5: 'all', // loyalty program status
};

// This is the mapping of status strings to numerical codes for easier comparison and storage.
export const STATUS_CODES = {
    pending: 0,
    confirmed: 1,
    rejected: 2,
    completed: 3,
    cancelled: 4, 
}

function createReverseMap<T extends Record<string, number>>(obj: T): Record<number, keyof T> {
    const reverseMap: Record<number, keyof T> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Keys in object are always strings, but when assigning obj[key] (a number)
            // as a key, JavaScript implicitly converts the number to a string key '0', '1', etc.
            // TypeScript correctly types this for us.
            reverseMap[obj[key]] = key;
        }
    }
    return reverseMap;
}

// Using a const assertion for strongly-typed branch IDs
export const BRANCHES = {
  PAARL: 0,
  BELLVILLE: 1,
  SOMERSET_WEST: 2,
} as const;

export const RESTAURANT = {
  DIENAGUIL: 0
} as const;

// Using a const assertion for strongly-typed role IDs
export const ROLES = {
  CUSTOMER: 0,
  STAFF: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
} as const;

export const BRANCH_NAMES_BY_ID = createReverseMap(BRANCHES);
export const RESTAURANT_NAMES_BY_ID = createReverseMap(RESTAURANT);
export const ROLES_NAMES_BY_ID = createReverseMap(ROLES);
export const STATUS_NAMES_BY_ID = createReverseMap(STATUS_CODES);

// Create a type from the const values
export type BranchId = typeof BRANCHES[keyof typeof BRANCHES];
export type RoleId = typeof ROLES[keyof typeof ROLES];
export type RestaurantId = typeof RESTAURANT[keyof typeof RESTAURANT];
export type StatusId = typeof STATUS_CODES[keyof typeof STATUS_CODES];

/**
 * Converts a branch ID (number) back to its name (string).
 * @param id The numerical branch ID (0, 1, 2).
 * @returns The branch name ('PAARL', 'BELLVILLE', etc.) or undefined if not found.
 */
export function getBranchName(id: number): string | undefined {
    return BRANCH_NAMES_BY_ID[id];
}

/**
 * Converts a restaurant ID (number) back to its name (string).
 * @param id The numerical restaurant ID (0).
 * @returns The restaurant name ('DIENAGUIL') or undefined if not found.
 */
export function getRestaurantName(id: number): string | undefined {
    return RESTAURANT_NAMES_BY_ID[id];
}

/**
 * Converts a roles ID (number) back to its name (string).
 * @param id The numerical roles ID (0).
 * @returns The Role name ('CUSTOMER, STAFF, ADMIN') or undefined if not found.
 */
export function getRolesName(id: number): string | undefined {
    return ROLES_NAMES_BY_ID[id];
}

/**
 * Converts a status ID (number) back to its name (string).
 * @param id The numerical status ID (0).
 * @returns The restaurant name ('pending, rejected, confirmed') or undefined if not found.
 */
export function getStatusName(id: number): string | undefined {
    return STATUS_NAMES_BY_ID[id];
}

export default {};