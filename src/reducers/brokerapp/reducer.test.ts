import { renderHook } from '@testing-library/react';
import {
  brokerAppReducer,
  createInitialBrokerAppState,
  useBrokerAppFormState,
  useBrokerAppFormDispatch,
} from './reducer';

describe('brokerAppReducer', () => {
  const ns = 'test-ns';

  let nowCounter = 0;

  beforeEach(() => {
    nowCounter = 0;
    jest.spyOn(global.Date, 'now').mockImplementation(() => ++nowCounter);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── ADD_ADDRESS ────────────────────────────────────────────────────────────

  it('ADD_ADDRESS creates an AddressRef with only the address field', () => {
    const state = brokerAppReducer(createInitialBrokerAppState(ns), {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'orders.created',
    });

    expect(state.producerOf).toEqual([{ address: 'orders.created' }]);
  });

  it('ADD_ADDRESS builds multiple producerOf addresses in spec', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.A',
    });
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.B',
    });
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.C',
    });

    const producerOf = state.cr.spec.capabilities?.[0]?.producerOf ?? [];
    expect(producerOf).toHaveLength(3);
    expect(producerOf.map((p) => p.address)).toEqual(
      expect.arrayContaining(['QUEUE.A', 'QUEUE.B', 'QUEUE.C']),
    );
  });

  it('ADD_ADDRESS ignores a duplicate address', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.DUPE',
    });
    const stateBeforeDupe = state;
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.DUPE',
    });

    expect(state).toBe(stateBeforeDupe);
    expect(state.producerOf).toHaveLength(1);
  });

  it('ADD_ADDRESS builds consumerOf in spec', () => {
    const state = brokerAppReducer(createInitialBrokerAppState(ns), {
      type: 'ADD_ADDRESS',
      field: 'consumerOf',
      payload: 'QUEUE.PAYMENTS',
    });

    expect(state.cr.spec.capabilities?.[0]?.consumerOf?.map((a) => a.address)).toContain(
      'QUEUE.PAYMENTS',
    );
  });

  // ─── REMOVE_ADDRESS ─────────────────────────────────────────────────────────

  it('REMOVE_ADDRESS removes the address from spec', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.KEEP',
    });
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.REMOVE',
    });
    state = brokerAppReducer(state, {
      type: 'REMOVE_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.REMOVE',
    });

    expect(state.producerOf.map((r) => r.address)).toEqual(['QUEUE.KEEP']);
  });

  // ─── SET_ADDRESS_PUBSUB ─────────────────────────────────────────────────────

  it('SET_ADDRESS_PUBSUB enables pubSub on the matching address', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'orders.events',
    });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_PUBSUB',
      field: 'producerOf',
      address: 'orders.events',
      pubSub: true,
    });

    expect(state.producerOf[0].pubSub).toBe(true);
    expect(state.cr.spec.capabilities?.[0]?.producerOf?.[0]).toEqual({
      address: 'orders.events',
      pubSub: true,
    });
  });

  it('SET_ADDRESS_PUBSUB disables pubSub and preserves subscriptions', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'orders.events',
    });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_PUBSUB',
      field: 'producerOf',
      address: 'orders.events',
      pubSub: true,
    });
    state = brokerAppReducer(state, {
      type: 'ADD_SUBSCRIPTION',
      field: 'producerOf',
      address: 'orders.events',
      subscription: 'audit',
    });
    // Disable pubSub — subscriptions must NOT be cleared (CRD allows independent fields).
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_PUBSUB',
      field: 'producerOf',
      address: 'orders.events',
      pubSub: false,
    });

    expect(state.producerOf[0].pubSub).toBe(false);
    expect(state.producerOf[0].subscriptions).toEqual(['audit']);
  });

  it('SET_ADDRESS_PUBSUB does not affect other addresses', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, { type: 'ADD_ADDRESS', field: 'producerOf', payload: 'A' });
    state = brokerAppReducer(state, { type: 'ADD_ADDRESS', field: 'producerOf', payload: 'B' });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_PUBSUB',
      field: 'producerOf',
      address: 'A',
      pubSub: true,
    });

    expect(state.producerOf.find((r) => r.address === 'B')?.pubSub).toBeUndefined();
  });

  // ─── ADD_SUBSCRIPTION ───────────────────────────────────────────────────────

  it('ADD_SUBSCRIPTION adds a subscription to the matching address', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'orders.events',
    });
    state = brokerAppReducer(state, {
      type: 'ADD_SUBSCRIPTION',
      field: 'producerOf',
      address: 'orders.events',
      subscription: 'audit',
    });

    expect(state.producerOf[0].subscriptions).toEqual(['audit']);
  });

  it('ADD_SUBSCRIPTION works independently of pubSub — subscriptions are a separate CRD field', () => {
    // The CRD treats pubSub and subscriptions as independent optional fields.
    // Subscriptions can be set even when pubSub is not enabled.
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'orders.events',
    });
    state = brokerAppReducer(state, {
      type: 'ADD_SUBSCRIPTION',
      field: 'producerOf',
      address: 'orders.events',
      subscription: 'audit',
    });

    expect(state.producerOf[0].pubSub).toBeUndefined();
    expect(state.producerOf[0].subscriptions).toEqual(['audit']);
  });

  it('ADD_SUBSCRIPTION ignores duplicate subscription names', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'orders.events',
    });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_PUBSUB',
      field: 'producerOf',
      address: 'orders.events',
      pubSub: true,
    });
    state = brokerAppReducer(state, {
      type: 'ADD_SUBSCRIPTION',
      field: 'producerOf',
      address: 'orders.events',
      subscription: 'audit',
    });
    state = brokerAppReducer(state, {
      type: 'ADD_SUBSCRIPTION',
      field: 'producerOf',
      address: 'orders.events',
      subscription: 'audit',
    });

    // Duplicate subscription — list must still have exactly one entry.
    expect(state.producerOf[0].subscriptions).toHaveLength(1);
    expect(state.producerOf[0].subscriptions).toEqual(['audit']);
  });

  // ─── REMOVE_SUBSCRIPTION ────────────────────────────────────────────────────

  it('REMOVE_SUBSCRIPTION removes only the requested subscription', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'orders.events',
    });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_PUBSUB',
      field: 'producerOf',
      address: 'orders.events',
      pubSub: true,
    });
    state = brokerAppReducer(state, {
      type: 'ADD_SUBSCRIPTION',
      field: 'producerOf',
      address: 'orders.events',
      subscription: 'audit',
    });
    state = brokerAppReducer(state, {
      type: 'ADD_SUBSCRIPTION',
      field: 'producerOf',
      address: 'orders.events',
      subscription: 'billing',
    });
    state = brokerAppReducer(state, {
      type: 'REMOVE_SUBSCRIPTION',
      field: 'producerOf',
      address: 'orders.events',
      subscription: 'audit',
    });

    expect(state.producerOf[0].subscriptions).toEqual(['billing']);
  });

  // ─── SET_ADDRESS_APP_NAMESPACE / SET_ADDRESS_APP_NAME ───────────────────────

  it('SET_ADDRESS_APP_NAMESPACE updates only the matching address', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'consumerOf',
      payload: 'orders.shipped',
    });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_APP_NAMESPACE',
      field: 'consumerOf',
      address: 'orders.shipped',
      appNamespace: 'production',
    });

    expect(state.consumerOf[0].appNamespace).toBe('production');
  });

  it('SET_ADDRESS_APP_NAME updates only the matching address', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'consumerOf',
      payload: 'orders.shipped',
    });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_APP_NAME',
      field: 'consumerOf',
      address: 'orders.shipped',
      appName: 'shipping-app',
    });

    expect(state.consumerOf[0].appName).toBe('shipping-app');
  });

  it('producerOf and consumerOf are updated independently', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.OUT',
    });
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'consumerOf',
      payload: 'QUEUE.IN',
    });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_PUBSUB',
      field: 'producerOf',
      address: 'QUEUE.OUT',
      pubSub: true,
    });

    expect(state.producerOf[0].pubSub).toBe(true);
    expect(state.consumerOf[0].pubSub).toBeUndefined();
  });

  // ─── CR SERIALISATION ───────────────────────────────────────────────────────

  it('buildCapabilities emits all configured fields in the CR', () => {
    let state = createInitialBrokerAppState(ns);
    state = brokerAppReducer(state, {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'orders.events',
    });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_PUBSUB',
      field: 'producerOf',
      address: 'orders.events',
      pubSub: true,
    });
    state = brokerAppReducer(state, {
      type: 'ADD_SUBSCRIPTION',
      field: 'producerOf',
      address: 'orders.events',
      subscription: 'audit',
    });
    state = brokerAppReducer(state, {
      type: 'ADD_SUBSCRIPTION',
      field: 'producerOf',
      address: 'orders.events',
      subscription: 'billing',
    });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_APP_NAMESPACE',
      field: 'producerOf',
      address: 'orders.events',
      appNamespace: 'payments',
    });
    state = brokerAppReducer(state, {
      type: 'SET_ADDRESS_APP_NAME',
      field: 'producerOf',
      address: 'orders.events',
      appName: 'payment-app',
    });

    expect(state.cr.spec.capabilities).toEqual([
      {
        producerOf: [
          {
            address: 'orders.events',
            pubSub: true,
            subscriptions: ['audit', 'billing'],
            appNamespace: 'payments',
            appName: 'payment-app',
          },
        ],
      },
    ]);
  });

  it('a simple address emits only the address field in the CR — no empty/false noise', () => {
    const state = brokerAppReducer(createInitialBrokerAppState(ns), {
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'orders.created',
    });

    expect(state.cr.spec.capabilities?.[0]?.producerOf?.[0]).toEqual({
      address: 'orders.created',
    });
  });

  // ─── SET_MODEL (edit existing CR) ───────────────────────────────────────────

  it('SET_MODEL preserves all AddressRef fields from an existing CR', () => {
    const state = brokerAppReducer(createInitialBrokerAppState(ns), {
      type: 'SET_MODEL',
      payload: {
        apiVersion: 'broker.arkmq.org/v1beta2',
        kind: 'BrokerApp',
        metadata: { name: 'imported', namespace: ns },
        spec: {
          selector: { matchLabels: { env: 'prod' } },
          capabilities: [
            {
              producerOf: [
                {
                  address: 'orders.events',
                  pubSub: true,
                  subscriptions: ['audit', 'billing'],
                  appNamespace: 'payments',
                  appName: 'payment-app',
                },
              ],
              consumerOf: [{ address: 'QUEUE.IN' }],
            },
          ],
        },
      },
    });

    expect(state.producerOf).toEqual([
      {
        address: 'orders.events',
        pubSub: true,
        subscriptions: ['audit', 'billing'],
        appNamespace: 'payments',
        appName: 'payment-app',
      },
    ]);
    expect(state.consumerOf).toEqual([{ address: 'QUEUE.IN' }]);
  });

  it('SET_MODEL with empty spec produces empty address lists', () => {
    const state = brokerAppReducer(createInitialBrokerAppState(ns), {
      type: 'SET_MODEL',
      payload: {
        apiVersion: 'broker.arkmq.org/v1beta2',
        kind: 'BrokerApp',
        metadata: { name: 'empty', namespace: ns },
        spec: {},
      },
    });

    expect(state.producerOf).toEqual([]);
    expect(state.consumerOf).toEqual([]);
  });

  // ─── MATCH LABELS (existing behaviour unchanged) ────────────────────────────

  it('REMOVE_MATCH_LABEL removes the label from spec.selector.matchLabels', () => {
    let state = createInitialBrokerAppState(ns);
    const id1 = state.matchLabels[0].id;
    state = brokerAppReducer(state, {
      type: 'UPDATE_MATCH_LABEL',
      payload: { id: id1, key: 'env', value: 'prod' },
    });
    state = brokerAppReducer(state, { type: 'ADD_MATCH_LABEL' });
    const id2 = state.matchLabels[1].id;
    state = brokerAppReducer(state, {
      type: 'UPDATE_MATCH_LABEL',
      payload: { id: id2, key: 'tier', value: 'web' },
    });
    state = brokerAppReducer(state, { type: 'REMOVE_MATCH_LABEL', payload: id1 });

    expect(state.cr.spec.selector?.matchLabels).toEqual({ tier: 'web' });
  });

  it('uses the first value when duplicate match label keys are synced to the CR', () => {
    let state = createInitialBrokerAppState(ns);
    const id1 = state.matchLabels[0].id;
    state = brokerAppReducer(state, {
      type: 'UPDATE_MATCH_LABEL',
      payload: { id: id1, key: 'key1', value: 'test' },
    });
    state = brokerAppReducer(state, { type: 'ADD_MATCH_LABEL' });
    const id2 = state.matchLabels[1].id;
    state = brokerAppReducer(state, {
      type: 'UPDATE_MATCH_LABEL',
      payload: { id: id2, key: 'key1', value: 'some-value' },
    });

    expect(state.cr.spec.selector?.matchLabels).toEqual({ key1: 'test' });
  });

  it('SET_MODEL with preserveLabels keeps form match label rows when duplicates exist', () => {
    let state = createInitialBrokerAppState(ns);
    const id1 = state.matchLabels[0].id;
    state = brokerAppReducer(state, {
      type: 'UPDATE_MATCH_LABEL',
      payload: { id: id1, key: 'key1', value: 'test' },
    });
    state = brokerAppReducer(state, { type: 'ADD_MATCH_LABEL' });
    const id2 = state.matchLabels[1].id;
    state = brokerAppReducer(state, {
      type: 'UPDATE_MATCH_LABEL',
      payload: { id: id2, key: 'key1', value: 'some-value' },
    });

    const next = brokerAppReducer(state, {
      type: 'SET_MODEL',
      payload: {
        apiVersion: 'broker.arkmq.org/v1beta2',
        kind: 'BrokerApp',
        metadata: { name: 'from-yaml', namespace: ns },
        spec: {
          selector: { matchLabels: { key1: 'test' } },
          capabilities: [{ producerOf: [{ address: 'QUEUE.OUT' }] }],
        },
      },
      preserveLabels: true,
    });

    expect(next.matchLabels).toEqual(state.matchLabels);
    expect(next.cr.spec.selector?.matchLabels).toEqual({ key1: 'test' });
    expect(next.cr.metadata?.name).toBe('from-yaml');
    expect(next.producerOf).toEqual([{ address: 'QUEUE.OUT' }]);
  });

  it('SET_NAME updates the CR metadata name', () => {
    const state = brokerAppReducer(createInitialBrokerAppState(ns), {
      type: 'SET_NAME',
      payload: 'my-broker-app',
    });

    expect(state.cr.metadata?.name).toBe('my-broker-app');
    expect(state.cr.metadata?.namespace).toBe(ns);
  });
});

describe('broker app hooks', () => {
  it('useBrokerAppFormState throws when used outside its Provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useBrokerAppFormState())).toThrow(
      'useBrokerAppFormState must be used inside BrokerAppFormStateContext.Provider',
    );
    jest.restoreAllMocks();
  });

  it('useBrokerAppFormDispatch throws when used outside its Provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useBrokerAppFormDispatch())).toThrow(
      'useBrokerAppFormDispatch must be used inside BrokerAppFormDispatchContext.Provider',
    );
    jest.restoreAllMocks();
  });
});
