import { render, screen, fireEvent } from '@testing-library/react';
import type { AddressRef } from '../../../k8s/types';
import { AddressRefCard } from './AddressRefCard';

const baseRef: AddressRef = { address: 'orders.events' };
const noop = () => undefined;

const defaultProps = {
  addressRef: baseRef,
  onRemove: noop,
  onTogglePubSub: noop,
  onAddSubscription: noop,
  onRemoveSubscription: noop,
  onChangeAppNamespace: noop,
  onChangeAppName: noop,
};

describe('AddressRefCard', () => {
  // ── Header ──────────────────────────────────────────────────────────────

  it('renders the address name in the header', () => {
    render(<AddressRefCard {...defaultProps} />);
    expect(screen.getByTestId('address-ref-name')).toHaveTextContent('orders.events');
  });

  it('renders the PubSub checkbox unchecked by default', () => {
    render(<AddressRefCard {...defaultProps} />);
    expect(screen.getByTestId('pubsub-checkbox')).not.toBeChecked();
  });

  it('renders the PubSub checkbox checked when pubSub is true', () => {
    render(
      <AddressRefCard {...defaultProps} addressRef={{ address: 'orders.events', pubSub: true }} />,
    );
    expect(screen.getByTestId('pubsub-checkbox')).toBeChecked();
  });

  it('calls onTogglePubSub with true when PubSub is checked', () => {
    const onTogglePubSub = jest.fn();
    render(<AddressRefCard {...defaultProps} onTogglePubSub={onTogglePubSub} />);
    fireEvent.click(screen.getByTestId('pubsub-checkbox'));
    expect(onTogglePubSub).toHaveBeenCalledWith(true);
  });

  it('calls onTogglePubSub with false when PubSub is unchecked', () => {
    const onTogglePubSub = jest.fn();
    render(
      <AddressRefCard
        {...defaultProps}
        addressRef={{ address: 'orders.events', pubSub: true }}
        onTogglePubSub={onTogglePubSub}
      />,
    );
    fireEvent.click(screen.getByTestId('pubsub-checkbox'));
    expect(onTogglePubSub).toHaveBeenCalledWith(false);
  });

  it('renders the remove button and calls onRemove when clicked', () => {
    const onRemove = jest.fn();
    render(<AddressRefCard {...defaultProps} onRemove={onRemove} />);
    fireEvent.click(screen.getByTestId('remove-address-button'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  // ── Options toggle ───────────────────────────────────────────────────────

  it('renders the Options toggle button', () => {
    render(<AddressRefCard {...defaultProps} />);
    expect(screen.getByTestId('options-toggle-button')).toBeInTheDocument();
  });

  it('options panel is hidden by default for a plain address', () => {
    render(<AddressRefCard {...defaultProps} />);
    expect(screen.queryByTestId('pubsub-options-panel')).not.toBeInTheDocument();
  });

  it('shows the options panel when the Options button is clicked', () => {
    render(<AddressRefCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    expect(screen.getByTestId('pubsub-options-panel')).toBeInTheDocument();
  });

  it('hides the options panel when the Options button is clicked again', () => {
    render(<AddressRefCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    expect(screen.queryByTestId('pubsub-options-panel')).not.toBeInTheDocument();
  });

  it('auto-expands the options panel when address has existing subscriptions', () => {
    render(
      <AddressRefCard
        {...defaultProps}
        addressRef={{ address: 'orders.events', pubSub: true, subscriptions: ['audit'] }}
      />,
    );
    expect(screen.getByTestId('pubsub-options-panel')).toBeInTheDocument();
  });

  it('auto-expands the options panel when address has appNamespace', () => {
    render(
      <AddressRefCard
        {...defaultProps}
        addressRef={{ address: 'orders.events', appNamespace: 'production' }}
      />,
    );
    expect(screen.getByTestId('pubsub-options-panel')).toBeInTheDocument();
  });

  it('auto-expands the options panel when address has appName', () => {
    render(
      <AddressRefCard
        {...defaultProps}
        addressRef={{ address: 'orders.events', appName: 'orders-app' }}
      />,
    );
    expect(screen.getByTestId('pubsub-options-panel')).toBeInTheDocument();
  });

  // ── Subscriptions (inside options panel, only when pubSub=true) ──────────

  it('does not show the subscriptions section when pubSub is false', () => {
    render(<AddressRefCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    expect(screen.queryByTestId('subscription-input')).not.toBeInTheDocument();
  });

  it('shows the subscriptions input when pubSub is true and panel is open', () => {
    render(
      <AddressRefCard {...defaultProps} addressRef={{ address: 'orders.events', pubSub: true }} />,
    );
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    expect(screen.getByTestId('subscription-input')).toBeInTheDocument();
  });

  it('renders existing subscription chips when pubSub is true', () => {
    render(
      <AddressRefCard
        {...defaultProps}
        addressRef={{ address: 'orders.events', pubSub: true, subscriptions: ['audit', 'billing'] }}
      />,
    );
    // subscriptions set → auto-expanded; no need to click Options
    const chips = screen.getAllByTestId('subscription-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveTextContent('audit');
    expect(chips[1]).toHaveTextContent('billing');
  });

  it('calls onAddSubscription when Enter is pressed in the subscription input', () => {
    const onAddSubscription = jest.fn();
    render(
      <AddressRefCard
        {...defaultProps}
        addressRef={{ address: 'orders.events', pubSub: true }}
        onAddSubscription={onAddSubscription}
      />,
    );
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    const input = screen.getByTestId('subscription-input');
    fireEvent.change(input, { target: { value: 'new-sub' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(onAddSubscription).toHaveBeenCalledWith('new-sub');
  });

  it('clears the subscription input after pressing Enter', () => {
    render(
      <AddressRefCard {...defaultProps} addressRef={{ address: 'orders.events', pubSub: true }} />,
    );
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    const input = screen.getByTestId('subscription-input');
    fireEvent.change(input, { target: { value: 'new-sub' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(input).toHaveValue('');
  });

  it('does not call onAddSubscription when Enter is pressed with blank input', () => {
    const onAddSubscription = jest.fn();
    render(
      <AddressRefCard
        {...defaultProps}
        addressRef={{ address: 'orders.events', pubSub: true }}
        onAddSubscription={onAddSubscription}
      />,
    );
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    fireEvent.keyDown(screen.getByTestId('subscription-input'), { key: 'Enter' });
    expect(onAddSubscription).not.toHaveBeenCalled();
  });

  it('calls onRemoveSubscription when a chip close button is clicked', () => {
    const onRemoveSubscription = jest.fn();
    render(
      <AddressRefCard
        {...defaultProps}
        addressRef={{ address: 'orders.events', pubSub: true, subscriptions: ['audit'] }}
        onRemoveSubscription={onRemoveSubscription}
      />,
    );
    // subscriptions set → auto-expanded; no need to click Options
    const chip = screen.getByTestId('subscription-chip');
    const closeBtn = chip.querySelector('button');
    if (!closeBtn) throw new Error('subscription chip close button not found');
    fireEvent.click(closeBtn);
    expect(onRemoveSubscription).toHaveBeenCalledWith('audit');
  });

  // ── Cross-app reference fields (always in options panel) ─────────────────

  it('renders App Namespace and App Name inputs in the options panel', () => {
    render(<AddressRefCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    expect(screen.getByTestId('app-namespace-input')).toBeInTheDocument();
    expect(screen.getByTestId('app-name-input')).toBeInTheDocument();
  });

  it('populates App Namespace from existing addressRef value', () => {
    render(
      <AddressRefCard
        {...defaultProps}
        addressRef={{ address: 'orders.events', appNamespace: 'production' }}
      />,
    );
    // auto-expands because appNamespace is set
    expect(screen.getByTestId('app-namespace-input')).toHaveValue('production');
  });

  it('populates App Name from existing addressRef value', () => {
    render(
      <AddressRefCard
        {...defaultProps}
        addressRef={{ address: 'orders.events', appName: 'orders-app' }}
      />,
    );
    // auto-expands because appName is set
    expect(screen.getByTestId('app-name-input')).toHaveValue('orders-app');
  });

  it('calls onChangeAppNamespace when App Namespace input changes', () => {
    const onChangeAppNamespace = jest.fn();
    render(<AddressRefCard {...defaultProps} onChangeAppNamespace={onChangeAppNamespace} />);
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    fireEvent.change(screen.getByTestId('app-namespace-input'), { target: { value: 'staging' } });
    expect(onChangeAppNamespace).toHaveBeenCalledWith('staging');
  });

  it('calls onChangeAppName when App Name input changes', () => {
    const onChangeAppName = jest.fn();
    render(<AddressRefCard {...defaultProps} onChangeAppName={onChangeAppName} />);
    fireEvent.click(screen.getByTestId('options-toggle-button'));
    fireEvent.change(screen.getByTestId('app-name-input'), { target: { value: 'payments-app' } });
    expect(onChangeAppName).toHaveBeenCalledWith('payments-app');
  });
});
