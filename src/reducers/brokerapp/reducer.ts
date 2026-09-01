import type { Dispatch } from 'react';
import { createContext, useContext } from 'react';
import type { AddressRef, BrokerAppCapability, BrokerAppCR, BrokerAppSpec } from '../../k8s/types';

export interface MatchLabel {
  id: string;
  key: string;
  value: string;
}

export type AddressField = 'producerOf' | 'consumerOf';

export interface BrokerAppFormState {
  cr: BrokerAppCR;
  matchLabels: MatchLabel[];
  producerOf: AddressRef[];
  consumerOf: AddressRef[];
}

export type BrokerAppFormAction =
  | { type: 'SET_NAME'; payload: string }
  | { type: 'ADD_ADDRESS'; field: AddressField; payload: string }
  | { type: 'REMOVE_ADDRESS'; field: AddressField; payload: string }
  | { type: 'SET_ADDRESS_PUBSUB'; field: AddressField; address: string; pubSub: boolean }
  | { type: 'ADD_SUBSCRIPTION'; field: AddressField; address: string; subscription: string }
  | { type: 'REMOVE_SUBSCRIPTION'; field: AddressField; address: string; subscription: string }
  | {
      type: 'SET_ADDRESS_APP_NAMESPACE';
      field: AddressField;
      address: string;
      appNamespace: string;
    }
  | { type: 'SET_ADDRESS_APP_NAME'; field: AddressField; address: string; appName: string }
  | { type: 'ADD_MATCH_LABEL' }
  | { type: 'REMOVE_MATCH_LABEL'; payload: string }
  | { type: 'UPDATE_MATCH_LABEL'; payload: { id: string; key: string; value: string } }
  | { type: 'SET_MODEL'; payload: BrokerAppCR; preserveLabels?: boolean };

// --- helpers ---

/**
 * Serialises an AddressRef into the CR object, omitting optional fields that
 * are falsy so the generated YAML stays minimal for simple addresses.
 */
const serialiseAddressRef = (ref: AddressRef): AddressRef => {
  const out: AddressRef = { address: ref.address };
  if (ref.pubSub) out.pubSub = true;
  if (ref.subscriptions?.length) out.subscriptions = ref.subscriptions;
  if (ref.appNamespace) out.appNamespace = ref.appNamespace;
  if (ref.appName) out.appName = ref.appName;
  return out;
};

/**
 * Builds the capabilities array for the CR spec from the current form state.
 * Returns undefined when both lists are empty so the spec stays clean.
 */
const buildCapabilities = (
  producerOf: AddressRef[],
  consumerOf: AddressRef[],
): BrokerAppCapability[] | undefined => {
  const cap: BrokerAppCapability = {};
  if (producerOf.length) cap.producerOf = producerOf.map(serialiseAddressRef);
  if (consumerOf.length) cap.consumerOf = consumerOf.map(serialiseAddressRef);
  return Object.keys(cap).length ? [cap] : undefined;
};

/**
 * First occurrence wins so duplicate form rows do not overwrite YAML preview values.
 */
const buildMatchLabels = (labels: MatchLabel[]): Record<string, string> | undefined => {
  const result: Record<string, string> = {};
  labels.forEach(({ key, value }) => {
    if (key && !(key in result)) {
      result[key] = value;
    }
  });
  return Object.keys(result).length ? result : undefined;
};

const matchLabelsFromRecord = (record: Record<string, string> | undefined): MatchLabel[] => {
  if (!record || !Object.keys(record).length) {
    return [{ id: String(Date.now()), key: '', value: '' }];
  }
  return Object.entries(record).map(([key, value], i) => ({
    id: `imported-${String(i)}-${String(Date.now())}`,
    key,
    value,
  }));
};

const mergeMatchLabelsWithYaml = (
  formLabels: MatchLabel[],
  yamlLabels: Record<string, string> | undefined,
): MatchLabel[] => {
  if (!yamlLabels) {
    return formLabels;
  }
  const existingKeys = new Set(formLabels.map(({ key }) => key).filter(Boolean));
  const merged = [...formLabels];
  Object.entries(yamlLabels).forEach(([key, value]) => {
    if (!existingKeys.has(key)) {
      merged.push({ id: String(Date.now()), key, value });
      existingKeys.add(key);
    }
  });
  return merged;
};

/**
 * Extracts AddressRef[] from a capabilities array, preserving all optional
 * fields so that editing an existing CR does not lose pubSub/subscriptions.
 */
const addressRefsFromCapabilities = (
  capabilities: BrokerAppCapability[] | undefined,
  field: AddressField,
): AddressRef[] => {
  return capabilities?.[0]?.[field] ?? [];
};

const buildSpec = (
  matchLabels: MatchLabel[],
  producerOf: AddressRef[],
  consumerOf: AddressRef[],
): BrokerAppSpec => {
  const resolvedMatchLabels = buildMatchLabels(matchLabels);
  const capabilities = buildCapabilities(producerOf, consumerOf);
  const spec: BrokerAppSpec = {};
  if (resolvedMatchLabels) spec.selector = { matchLabels: resolvedMatchLabels };
  if (capabilities) spec.capabilities = capabilities;
  return spec;
};

/**
 * Returns an updated copy of an address list with the matching entry replaced.
 * No-ops if the address is not found.
 */
const updateAddress = (
  list: AddressRef[],
  address: string,
  updater: (ref: AddressRef) => AddressRef,
): AddressRef[] => list.map((ref) => (ref.address === address ? updater(ref) : ref));

// --- reducer ---

/**
 * Manages the full form state for Create/Edit BrokerApp.
 * All address-level business logic (pubSub clearing, deduplication) lives
 * here so view components only dispatch descriptive actions.
 */
export const brokerAppReducer = (
  state: BrokerAppFormState,
  action: BrokerAppFormAction,
): BrokerAppFormState => {
  switch (action.type) {
    case 'SET_NAME':
      return {
        ...state,
        cr: {
          ...state.cr,
          metadata: { ...state.cr.metadata, name: action.payload },
        },
      };

    case 'ADD_ADDRESS': {
      const list = state[action.field];
      if (list.some((r) => r.address === action.payload)) return state;
      const newRef: AddressRef = { address: action.payload };
      const updated = [...list, newRef];
      const newArrays = {
        producerOf: action.field === 'producerOf' ? updated : state.producerOf,
        consumerOf: action.field === 'consumerOf' ? updated : state.consumerOf,
      };
      return {
        ...state,
        ...newArrays,
        cr: {
          ...state.cr,
          spec: buildSpec(state.matchLabels, newArrays.producerOf, newArrays.consumerOf),
        },
      };
    }

    case 'REMOVE_ADDRESS': {
      const updated = state[action.field].filter((r) => r.address !== action.payload);
      const newArrays = {
        producerOf: action.field === 'producerOf' ? updated : state.producerOf,
        consumerOf: action.field === 'consumerOf' ? updated : state.consumerOf,
      };
      return {
        ...state,
        ...newArrays,
        cr: {
          ...state.cr,
          spec: buildSpec(state.matchLabels, newArrays.producerOf, newArrays.consumerOf),
        },
      };
    }

    case 'SET_ADDRESS_PUBSUB': {
      const updated = updateAddress(state[action.field], action.address, (ref) => ({
        ...ref,
        pubSub: action.pubSub,
        // Subscriptions are preserved when pubSub is toggled off — the CRD treats
        // them as independent fields and does not reject subscriptions without pubSub.
        // Preserving them also avoids accidental data loss if the user re-enables pubSub.
      }));
      const newArrays = {
        producerOf: action.field === 'producerOf' ? updated : state.producerOf,
        consumerOf: action.field === 'consumerOf' ? updated : state.consumerOf,
      };
      return {
        ...state,
        ...newArrays,
        cr: {
          ...state.cr,
          spec: buildSpec(state.matchLabels, newArrays.producerOf, newArrays.consumerOf),
        },
      };
    }

    case 'ADD_SUBSCRIPTION': {
      const updated = updateAddress(state[action.field], action.address, (ref) => {
        // Subscriptions are independent of pubSub per CRD — allow them regardless.
        const existing = ref.subscriptions ?? [];
        // Prevent duplicate subscription names.
        if (existing.includes(action.subscription)) return ref;
        return { ...ref, subscriptions: [...existing, action.subscription] };
      });
      const newArrays = {
        producerOf: action.field === 'producerOf' ? updated : state.producerOf,
        consumerOf: action.field === 'consumerOf' ? updated : state.consumerOf,
      };
      return {
        ...state,
        ...newArrays,
        cr: {
          ...state.cr,
          spec: buildSpec(state.matchLabels, newArrays.producerOf, newArrays.consumerOf),
        },
      };
    }

    case 'REMOVE_SUBSCRIPTION': {
      const updated = updateAddress(state[action.field], action.address, (ref) => ({
        ...ref,
        subscriptions: (ref.subscriptions ?? []).filter((s) => s !== action.subscription),
      }));
      const newArrays = {
        producerOf: action.field === 'producerOf' ? updated : state.producerOf,
        consumerOf: action.field === 'consumerOf' ? updated : state.consumerOf,
      };
      return {
        ...state,
        ...newArrays,
        cr: {
          ...state.cr,
          spec: buildSpec(state.matchLabels, newArrays.producerOf, newArrays.consumerOf),
        },
      };
    }

    case 'SET_ADDRESS_APP_NAMESPACE': {
      const updated = updateAddress(state[action.field], action.address, (ref) => ({
        ...ref,
        appNamespace: action.appNamespace,
      }));
      const newArrays = {
        producerOf: action.field === 'producerOf' ? updated : state.producerOf,
        consumerOf: action.field === 'consumerOf' ? updated : state.consumerOf,
      };
      return {
        ...state,
        ...newArrays,
        cr: {
          ...state.cr,
          spec: buildSpec(state.matchLabels, newArrays.producerOf, newArrays.consumerOf),
        },
      };
    }

    case 'SET_ADDRESS_APP_NAME': {
      const updated = updateAddress(state[action.field], action.address, (ref) => ({
        ...ref,
        appName: action.appName,
      }));
      const newArrays = {
        producerOf: action.field === 'producerOf' ? updated : state.producerOf,
        consumerOf: action.field === 'consumerOf' ? updated : state.consumerOf,
      };
      return {
        ...state,
        ...newArrays,
        cr: {
          ...state.cr,
          spec: buildSpec(state.matchLabels, newArrays.producerOf, newArrays.consumerOf),
        },
      };
    }

    case 'ADD_MATCH_LABEL':
      return {
        ...state,
        matchLabels: [...state.matchLabels, { id: String(Date.now()), key: '', value: '' }],
      };

    case 'REMOVE_MATCH_LABEL': {
      const matchLabels = state.matchLabels.filter((l) => l.id !== action.payload);
      return {
        ...state,
        matchLabels,
        cr: {
          ...state.cr,
          spec: buildSpec(matchLabels, state.producerOf, state.consumerOf),
        },
      };
    }

    case 'UPDATE_MATCH_LABEL': {
      const matchLabels = state.matchLabels.map((l) =>
        l.id === action.payload.id
          ? { ...l, key: action.payload.key, value: action.payload.value }
          : l,
      );
      return {
        ...state,
        matchLabels,
        cr: {
          ...state.cr,
          spec: buildSpec(matchLabels, state.producerOf, state.consumerOf),
        },
      };
    }

    case 'SET_MODEL': {
      const newCr = action.payload;
      if (action.preserveLabels) {
        const mergedMatchLabels = mergeMatchLabelsWithYaml(
          state.matchLabels,
          newCr.spec.selector?.matchLabels,
        );
        return {
          ...state,
          cr: {
            ...newCr,
            spec: buildSpec(
              mergedMatchLabels,
              addressRefsFromCapabilities(newCr.spec.capabilities, 'producerOf'),
              addressRefsFromCapabilities(newCr.spec.capabilities, 'consumerOf'),
            ),
          },
          matchLabels: mergedMatchLabels,
          producerOf: addressRefsFromCapabilities(newCr.spec.capabilities, 'producerOf'),
          consumerOf: addressRefsFromCapabilities(newCr.spec.capabilities, 'consumerOf'),
        };
      }
      return {
        ...state,
        cr: newCr,
        matchLabels: matchLabelsFromRecord(newCr.spec.selector?.matchLabels),
        producerOf: addressRefsFromCapabilities(newCr.spec.capabilities, 'producerOf'),
        consumerOf: addressRefsFromCapabilities(newCr.spec.capabilities, 'consumerOf'),
      };
    }

    default:
      return state;
  }
};

export const createInitialBrokerAppState = (namespace: string): BrokerAppFormState => ({
  cr: {
    apiVersion: 'broker.arkmq.org/v1beta2',
    kind: 'BrokerApp',
    metadata: { name: 'my-messaging-app', namespace },
    spec: {},
  },
  matchLabels: [{ id: String(Date.now()), key: '', value: '' }],
  producerOf: [],
  consumerOf: [],
});

export const BrokerAppFormStateContext = createContext<BrokerAppFormState | undefined>(undefined);
export const BrokerAppFormDispatchContext = createContext<
  Dispatch<BrokerAppFormAction> | undefined
>(undefined);

/**
 * Consumes BrokerAppFormState from context.
 * Must be rendered inside BrokerAppFormStateContext.Provider.
 */
export const useBrokerAppFormState = (): BrokerAppFormState => {
  const ctx = useContext(BrokerAppFormStateContext);
  if (!ctx)
    throw new Error('useBrokerAppFormState must be used inside BrokerAppFormStateContext.Provider');
  return ctx;
};

/**
 * Consumes the BrokerApp form dispatch function from context.
 * Must be rendered inside BrokerAppFormDispatchContext.Provider.
 */
export const useBrokerAppFormDispatch = (): Dispatch<BrokerAppFormAction> => {
  const ctx = useContext(BrokerAppFormDispatchContext);
  if (!ctx)
    throw new Error(
      'useBrokerAppFormDispatch must be used inside BrokerAppFormDispatchContext.Provider',
    );
  return ctx;
};
