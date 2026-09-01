import * as React from 'react';
import { useReducer } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  brokerAppReducer,
  createInitialBrokerAppState,
  BrokerAppFormStateContext,
  BrokerAppFormDispatchContext,
  type BrokerAppFormState,
} from '../../../reducers/brokerapp/reducer';
import { CapabilitiesSection } from './CapabilitiesSection';

const makeStateWithAddresses = (): BrokerAppFormState => {
  let state = createInitialBrokerAppState('default');
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
  return state;
};

const Wrapper: React.FC<{ initialState?: BrokerAppFormState }> = ({ initialState }) => {
  const [state, dispatch] = useReducer(
    brokerAppReducer,
    initialState ?? createInitialBrokerAppState('default'),
  );
  return (
    <BrokerAppFormStateContext.Provider value={state}>
      <BrokerAppFormDispatchContext.Provider value={dispatch}>
        <CapabilitiesSection />
      </BrokerAppFormDispatchContext.Provider>
    </BrokerAppFormStateContext.Provider>
  );
};

describe('CapabilitiesSection', () => {
  it('renders existing producerOf and consumerOf addresses from state', () => {
    render(<Wrapper initialState={makeStateWithAddresses()} />);
    expect(screen.getByText('QUEUE.OUT')).toBeInTheDocument();
    expect(screen.getByText('QUEUE.IN')).toBeInTheDocument();
  });

  it('adding an address to producerOf shows a new card', () => {
    render(<Wrapper />);
    const input = screen.getByTestId('add-address-input-producerOf');
    fireEvent.change(input, { target: { value: 'QUEUE.ORDERS' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('QUEUE.ORDERS')).toBeInTheDocument();
  });

  it('adding an address to consumerOf does not appear in producerOf', () => {
    render(<Wrapper />);
    const input = screen.getByTestId('add-address-input-consumerOf');
    fireEvent.change(input, { target: { value: 'QUEUE.PAYMENTS' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('QUEUE.PAYMENTS')).toBeInTheDocument();
    // Should not appear inside the producerOf list
    const producerList = screen.getByTestId('address-list-input-producerOf');
    expect(producerList).not.toHaveTextContent('QUEUE.PAYMENTS');
  });

  it('checking PubSub on a producer address updates the checkbox', () => {
    render(<Wrapper initialState={makeStateWithAddresses()} />);
    const checkbox = screen.getAllByTestId('pubsub-checkbox')[0];
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('renders existing rich address data when editing an existing BrokerApp', () => {
    let state = createInitialBrokerAppState('default');
    state = brokerAppReducer(state, {
      type: 'SET_MODEL',
      payload: {
        apiVersion: 'broker.arkmq.org/v1beta2',
        kind: 'BrokerApp',
        metadata: { name: 'existing', namespace: 'default' },
        spec: {
          capabilities: [
            {
              producerOf: [{ address: 'orders.events', pubSub: true, subscriptions: ['audit'] }],
            },
          ],
        },
      },
    });

    render(<Wrapper initialState={state} />);
    expect(screen.getByText('orders.events')).toBeInTheDocument();
    // subscriptions set → options panel auto-expands; audit chip is visible
    expect(screen.getByTestId('pubsub-options-panel')).toBeInTheDocument();
    expect(screen.getByText('audit')).toBeInTheDocument();
  });
});
