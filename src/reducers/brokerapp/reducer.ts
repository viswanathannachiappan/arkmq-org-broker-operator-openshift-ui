import type { Dispatch } from 'react';
import { createContext, useContext } from 'react';
import type {
  BrokerAppCapability,
  BrokerAppCR,
  BrokerAppSpec,
  ResourceRequirements,
} from '../../k8s/types';

export interface MatchLabel {
  id: string;
  key: string;
  value: string;
}

export type AddressField = 'producerOf' | 'consumerOf';

export interface BrokerAppFormState {
  cr: BrokerAppCR;
  matchLabels: MatchLabel[];
  producerOf: string[];
  consumerOf: string[];
  cpuRequest: string;
  cpuLimit: string;
  memoryRequest: string;
  memoryLimit: string;
}

export type BrokerAppFormAction =
  | { type: 'SET_NAME'; payload: string }
  | { type: 'ADD_ADDRESS'; field: AddressField; payload: string }
  | { type: 'REMOVE_ADDRESS'; field: AddressField; payload: string }
  | { type: 'ADD_MATCH_LABEL' }
  | { type: 'REMOVE_MATCH_LABEL'; payload: string }
  | { type: 'UPDATE_MATCH_LABEL'; payload: { id: string; key: string; value: string } }
  | { type: 'SET_CPU_REQUEST'; payload: string }
  | { type: 'SET_CPU_LIMIT'; payload: string }
  | { type: 'SET_MEMORY_REQUEST'; payload: string }
  | { type: 'SET_MEMORY_LIMIT'; payload: string }
  | { type: 'SET_MODEL'; payload: BrokerAppCR; preserveLabels?: boolean };

// --- helpers ---

const buildCapabilities = (
  producerOf: string[],
  consumerOf: string[],
): BrokerAppCapability[] | undefined => {
  const cap: BrokerAppCapability = {};
  if (producerOf.length) cap.producerOf = producerOf.map((a) => ({ address: a }));
  if (consumerOf.length) cap.consumerOf = consumerOf.map((a) => ({ address: a }));
  return Object.keys(cap).length ? [cap] : undefined;
};

// First occurrence wins so duplicate form rows do not overwrite YAML preview values.
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

const addressesFromCapabilities = (
  capabilities: BrokerAppCapability[] | undefined,
  field: AddressField,
): string[] => {
  const arr = capabilities?.[0]?.[field];
  return arr ? arr.map((a) => a.address) : [];
};

const buildResources = (
  cpuRequest: string,
  cpuLimit: string,
  memoryRequest: string,
  memoryLimit: string,
): ResourceRequirements | undefined => {
  const requests: Record<string, string> = {};
  const limits: Record<string, string> = {};
  if (cpuRequest) requests.cpu = cpuRequest;
  if (memoryRequest) requests.memory = memoryRequest;
  if (cpuLimit) limits.cpu = cpuLimit;
  if (memoryLimit) limits.memory = memoryLimit;
  const hasRequests = Object.keys(requests).length > 0;
  const hasLimits = Object.keys(limits).length > 0;
  if (!hasRequests && !hasLimits) return undefined;
  const resources: ResourceRequirements = {};
  if (hasRequests) resources.requests = requests;
  if (hasLimits) resources.limits = limits;
  return resources;
};

const buildSpec = (
  matchLabels: MatchLabel[],
  producerOf: string[],
  consumerOf: string[],
  cpuRequest = '',
  cpuLimit = '',
  memoryRequest = '',
  memoryLimit = '',
): BrokerAppSpec => {
  const resolvedMatchLabels = buildMatchLabels(matchLabels);
  const capabilities = buildCapabilities(producerOf, consumerOf);
  const resources = buildResources(cpuRequest, cpuLimit, memoryRequest, memoryLimit);
  const spec: BrokerAppSpec = {};
  if (resolvedMatchLabels) spec.selector = { matchLabels: resolvedMatchLabels };
  if (capabilities) spec.capabilities = capabilities;
  if (resources) spec.resources = resources;
  return spec;
};

// --- reducer ---

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
      if (list.includes(action.payload)) return state;
      const updated = [...list, action.payload];
      const newArrays = {
        producerOf: action.field === 'producerOf' ? updated : state.producerOf,
        consumerOf: action.field === 'consumerOf' ? updated : state.consumerOf,
      };
      return {
        ...state,
        ...newArrays,
        cr: {
          ...state.cr,
          spec: buildSpec(
            state.matchLabels,
            newArrays.producerOf,
            newArrays.consumerOf,
            state.cpuRequest,
            state.cpuLimit,
            state.memoryRequest,
            state.memoryLimit,
          ),
        },
      };
    }

    case 'REMOVE_ADDRESS': {
      const updated = state[action.field].filter((a) => a !== action.payload);
      const newArrays = {
        producerOf: action.field === 'producerOf' ? updated : state.producerOf,
        consumerOf: action.field === 'consumerOf' ? updated : state.consumerOf,
      };
      return {
        ...state,
        ...newArrays,
        cr: {
          ...state.cr,
          spec: buildSpec(
            state.matchLabels,
            newArrays.producerOf,
            newArrays.consumerOf,
            state.cpuRequest,
            state.cpuLimit,
            state.memoryRequest,
            state.memoryLimit,
          ),
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
          spec: buildSpec(
            matchLabels,
            state.producerOf,
            state.consumerOf,
            state.cpuRequest,
            state.cpuLimit,
            state.memoryRequest,
            state.memoryLimit,
          ),
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
          spec: buildSpec(
            matchLabels,
            state.producerOf,
            state.consumerOf,
            state.cpuRequest,
            state.cpuLimit,
            state.memoryRequest,
            state.memoryLimit,
          ),
        },
      };
    }

    case 'SET_CPU_REQUEST': {
      return {
        ...state,
        cpuRequest: action.payload,
        cr: {
          ...state.cr,
          spec: buildSpec(
            state.matchLabels,
            state.producerOf,
            state.consumerOf,
            action.payload,
            state.cpuLimit,
            state.memoryRequest,
            state.memoryLimit,
          ),
        },
      };
    }

    case 'SET_CPU_LIMIT': {
      return {
        ...state,
        cpuLimit: action.payload,
        cr: {
          ...state.cr,
          spec: buildSpec(
            state.matchLabels,
            state.producerOf,
            state.consumerOf,
            state.cpuRequest,
            action.payload,
            state.memoryRequest,
            state.memoryLimit,
          ),
        },
      };
    }

    case 'SET_MEMORY_REQUEST': {
      return {
        ...state,
        memoryRequest: action.payload,
        cr: {
          ...state.cr,
          spec: buildSpec(
            state.matchLabels,
            state.producerOf,
            state.consumerOf,
            state.cpuRequest,
            state.cpuLimit,
            action.payload,
            state.memoryLimit,
          ),
        },
      };
    }

    case 'SET_MEMORY_LIMIT': {
      return {
        ...state,
        memoryLimit: action.payload,
        cr: {
          ...state.cr,
          spec: buildSpec(
            state.matchLabels,
            state.producerOf,
            state.consumerOf,
            state.cpuRequest,
            state.cpuLimit,
            state.memoryRequest,
            action.payload,
          ),
        },
      };
    }

    case 'SET_MODEL': {
      const newCr = action.payload;
      const cpuRequest = newCr.spec.resources?.requests?.cpu ?? '';
      const cpuLimit = newCr.spec.resources?.limits?.cpu ?? '';
      const memoryRequest = newCr.spec.resources?.requests?.memory ?? '';
      const memoryLimit = newCr.spec.resources?.limits?.memory ?? '';
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
              addressesFromCapabilities(newCr.spec.capabilities, 'producerOf'),
              addressesFromCapabilities(newCr.spec.capabilities, 'consumerOf'),
              cpuRequest,
              cpuLimit,
              memoryRequest,
              memoryLimit,
            ),
          },
          matchLabels: mergedMatchLabels,
          producerOf: addressesFromCapabilities(newCr.spec.capabilities, 'producerOf'),
          consumerOf: addressesFromCapabilities(newCr.spec.capabilities, 'consumerOf'),
          cpuRequest,
          cpuLimit,
          memoryRequest,
          memoryLimit,
        };
      }
      return {
        ...state,
        cr: newCr,
        matchLabels: matchLabelsFromRecord(newCr.spec.selector?.matchLabels),
        producerOf: addressesFromCapabilities(newCr.spec.capabilities, 'producerOf'),
        consumerOf: addressesFromCapabilities(newCr.spec.capabilities, 'consumerOf'),
        cpuRequest,
        cpuLimit,
        memoryRequest,
        memoryLimit,
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
  cpuRequest: '',
  cpuLimit: '',
  memoryRequest: '',
  memoryLimit: '',
});

export const BrokerAppFormStateContext = createContext<BrokerAppFormState | undefined>(undefined);
export const BrokerAppFormDispatchContext = createContext<
  Dispatch<BrokerAppFormAction> | undefined
>(undefined);

export const useBrokerAppFormState = (): BrokerAppFormState => {
  const ctx = useContext(BrokerAppFormStateContext);
  if (!ctx)
    throw new Error('useBrokerAppFormState must be used inside BrokerAppFormStateContext.Provider');
  return ctx;
};

export const useBrokerAppFormDispatch = (): Dispatch<BrokerAppFormAction> => {
  const ctx = useContext(BrokerAppFormDispatchContext);
  if (!ctx)
    throw new Error(
      'useBrokerAppFormDispatch must be used inside BrokerAppFormDispatchContext.Provider',
    );
  return ctx;
};
