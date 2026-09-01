import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextInput } from '@patternfly/react-core';
import { AddressRefCard } from './AddressRefCard';
import type { AddressRef } from '../../../k8s/types';
import type { AddressField, BrokerAppFormAction } from '../../../reducers/brokerapp/reducer';
import type { Dispatch } from 'react';

interface AddressListInputProps {
  /** The list of address references to render as cards. */
  addressRefs: AddressRef[];
  /** The capability field this list belongs to — used to scope dispatched actions. */
  field: AddressField;
  /** Placeholder text for the new-address text input. */
  placeholder: string;
  /** Form dispatch — all mutations are delegated to the reducer. */
  dispatch: Dispatch<BrokerAppFormAction>;
}

/**
 * Renders an ordered list of AddressRefCard components plus an inline
 * text input to add new addresses for one capability direction
 * (Produces To or Consumes From).
 *
 * This component owns no address state — it delegates all mutations to the
 * reducer via dispatch so the CR YAML preview stays in sync.
 */
export const AddressListInput: React.FC<AddressListInputProps> = ({
  addressRefs,
  field,
  placeholder,
  dispatch,
}) => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      dispatch({ type: 'ADD_ADDRESS', field, payload: trimmed });
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div data-test={`address-list-input-${field}`}>
      {/* ── Add new address — input at top, matching wireframe ── */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--pf-v6-global--spacer--sm)',
          marginBottom: 'var(--pf-v6-global--spacer--sm)',
        }}
      >
        <TextInput
          id={`add-address-${field}`}
          value={inputValue}
          onChange={(_e, val) => {
            setInputValue(val);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={t('New address')}
          data-test={`add-address-input-${field}`}
        />
        <Button
          variant="primary"
          onClick={handleAdd}
          data-test={`add-address-button-${field}`}
        >
          {t('Add')}
        </Button>
      </div>

      {/* ── Address cards — rendered below the input ── */}
      {addressRefs.map((ref) => (
        <AddressRefCard
          key={ref.address}
          addressRef={ref}
          onRemove={() => {
            dispatch({ type: 'REMOVE_ADDRESS', field, payload: ref.address });
          }}
          onTogglePubSub={(enabled) => {
            dispatch({ type: 'SET_ADDRESS_PUBSUB', field, address: ref.address, pubSub: enabled });
          }}
          onAddSubscription={(subscription) => {
            dispatch({ type: 'ADD_SUBSCRIPTION', field, address: ref.address, subscription });
          }}
          onRemoveSubscription={(subscription) => {
            dispatch({ type: 'REMOVE_SUBSCRIPTION', field, address: ref.address, subscription });
          }}
          onChangeAppNamespace={(appNamespace) => {
            dispatch({
              type: 'SET_ADDRESS_APP_NAMESPACE',
              field,
              address: ref.address,
              appNamespace,
            });
          }}
          onChangeAppName={(appName) => {
            dispatch({ type: 'SET_ADDRESS_APP_NAME', field, address: ref.address, appName });
          }}
        />
      ))}
    </div>
  );
};
