import { render, screen, fireEvent } from '@testing-library/react';
import type { AddressRef } from '../../../k8s/types';
import { brokerAppReducer, createInitialBrokerAppState } from '../../../reducers/brokerapp/reducer';
import { AddressListInput } from './AddressListInput';

const renderList = (refs: AddressRef[], field: 'producerOf' | 'consumerOf' = 'producerOf') => {
  const dispatch = jest.fn();
  render(
    <AddressListInput
      field={field}
      addressRefs={refs}
      dispatch={dispatch}
      placeholder="e.g., test.address"
    />,
  );
  return { dispatch };
};

describe('AddressListInput', () => {
  it('renders a card for each address ref', () => {
    renderList([{ address: 'QUEUE.A' }, { address: 'QUEUE.B' }]);
    expect(screen.getByText('QUEUE.A')).toBeInTheDocument();
    expect(screen.getByText('QUEUE.B')).toBeInTheDocument();
  });

  it('dispatches ADD_ADDRESS when Enter is pressed in the text input', () => {
    const { dispatch } = renderList([]);
    const input = screen.getByTestId('add-address-input-producerOf');
    fireEvent.change(input, { target: { value: 'QUEUE.NEW' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.NEW',
    });
  });

  it('dispatches ADD_ADDRESS when the Add address button is clicked', () => {
    const { dispatch } = renderList([]);
    const input = screen.getByTestId('add-address-input-producerOf');
    fireEvent.change(input, { target: { value: 'QUEUE.BTN' } });
    fireEvent.click(screen.getByTestId('add-address-button-producerOf'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.BTN',
    });
  });

  it('does not dispatch when the input is blank', () => {
    const { dispatch } = renderList([]);
    fireEvent.click(screen.getByTestId('add-address-button-producerOf'));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches REMOVE_ADDRESS when the remove button on a card is clicked', () => {
    const { dispatch } = renderList([{ address: 'QUEUE.A' }]);
    fireEvent.click(screen.getByTestId('remove-address-button'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'REMOVE_ADDRESS',
      field: 'producerOf',
      payload: 'QUEUE.A',
    });
  });

  it('dispatches SET_ADDRESS_PUBSUB when the PubSub checkbox is toggled', () => {
    const { dispatch } = renderList([{ address: 'QUEUE.A' }]);
    fireEvent.click(screen.getByTestId('pubsub-checkbox')); // checkbox always visible in header
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_ADDRESS_PUBSUB',
      field: 'producerOf',
      address: 'QUEUE.A',
      pubSub: true,
    });
  });

  it('renders cards for the consumerOf field with the correct data-test id', () => {
    renderList([{ address: 'QUEUE.IN' }], 'consumerOf');
    expect(screen.getByTestId('address-list-input-consumerOf')).toBeInTheDocument();
    expect(screen.getByText('QUEUE.IN')).toBeInTheDocument();
  });

  it('input is cleared after adding an address', () => {
    renderList([]);
    const input = screen.getByTestId('add-address-input-producerOf');
    fireEvent.change(input, { target: { value: 'QUEUE.CLEAR' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(input).toHaveValue('');
  });

  it('ADD_ADDRESS round-trip — address appears in the list via real reducer', () => {
    let state = createInitialBrokerAppState('default');
    const dispatch = (action: Parameters<typeof brokerAppReducer>[1]) => {
      state = brokerAppReducer(state, action);
    };

    render(
      <AddressListInput
        field="producerOf"
        addressRefs={state.producerOf}
        dispatch={dispatch as never}
        placeholder="e.g., test"
      />,
    );

    expect(state.producerOf).toHaveLength(0);
    const input = screen.getByTestId('add-address-input-producerOf');
    fireEvent.change(input, { target: { value: 'QUEUE.ROUNDTRIP' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(state.producerOf).toHaveLength(1);
    expect(state.producerOf[0].address).toBe('QUEUE.ROUNDTRIP');
  });
});
