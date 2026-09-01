import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Checkbox,
  FormGroup,
  Grid,
  GridItem,
  Label,
  LabelGroup,
  TextInput,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons/dist/esm/icons/times-icon';
import { AngleDownIcon } from '@patternfly/react-icons/dist/esm/icons/angle-down-icon';
import { AngleRightIcon } from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import type { AddressRef } from '../../../k8s/types';

interface AddressRefCardProps {
  /** The full address reference object to render. */
  addressRef: AddressRef;
  /** Called when the user removes this address entirely. */
  onRemove: () => void;
  /**
   * Called when the user toggles the PubSub checkbox.
   * The reducer owns the state transition; this is a pure notification.
   */
  onTogglePubSub: (enabled: boolean) => void;
  /** Called when the user adds a new subscription name via Enter key. */
  onAddSubscription: (subscription: string) => void;
  /** Called when the user removes an existing subscription chip. */
  onRemoveSubscription: (subscription: string) => void;
  /** Called when the App Namespace field changes. */
  onChangeAppNamespace: (value: string) => void;
  /** Called when the App Name field changes. */
  onChangeAppName: (value: string) => void;
}

/**
 * Renders a single AddressRef as a card matching the story AC.
 *
 * Header row: [address name] ... [☐ PubSub] [Options ▶/▼] [✕]
 *
 * PubSub checkbox is always visible in the header for a quick toggle.
 *
 * The expandable options panel (AC1) contains:
 *   - Subscriptions list with removable chips + inline "Add subscription..." input (AC3)
 *     Only shown when pubSub is checked (subscriptions are only meaningful with pubSub).
 *   - App Namespace and App Name inputs for cross-app address references (AC4)
 *     Always shown inside the panel — independent of pubSub.
 *
 * The options panel auto-expands when the address already has any non-default
 * values so that existing data is immediately visible in edit mode.
 *
 * All form state lives in the reducer. Local state is limited to the
 * subscription text-input value and the expand/collapse toggle.
 */
export const AddressRefCard: React.FC<AddressRefCardProps> = ({
  addressRef,
  onRemove,
  onTogglePubSub,
  onAddSubscription,
  onRemoveSubscription,
  onChangeAppNamespace,
  onChangeAppName,
}) => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');

  // Auto-expand when the address already has non-default options so that
  // existing data (subscriptions, cross-app refs) is immediately visible.
  const hasOptions =
    (addressRef.subscriptions ?? []).length > 0 ||
    !!addressRef.appNamespace ||
    !!addressRef.appName;
  const [isExpanded, setIsExpanded] = useState(hasOptions);
  const [subInput, setSubInput] = useState('');

  const handleSubKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = subInput.trim();
      if (trimmed) {
        onAddSubscription(trimmed);
        setSubInput('');
      }
    }
  };

  return (
    <div
      data-test="address-ref-card"
      style={{
        border: '1px solid var(--pf-v6-global--BorderColor--100)',
        borderRadius: 'var(--pf-v6-global--BorderRadius--sm)',
        marginBottom: 'var(--pf-v6-global--spacer--sm)',
        background: 'var(--pf-v6-global--BackgroundColor--100)',
      }}
    >
      {/* ── Header: address name | PubSub | Options toggle | remove ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--pf-v6-global--spacer--sm) var(--pf-v6-global--spacer--md)',
        }}
      >
        <span
          data-test="address-ref-name"
          style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
        >
          {addressRef.address}
        </span>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--pf-v6-global--spacer--md)',
          }}
        >
          {/* PubSub quick-toggle always visible in header */}
          <Checkbox
            id={`pubsub-${addressRef.address}`}
            label={t('PubSub')}
            isChecked={addressRef.pubSub === true}
            onChange={(_e, checked) => {
              onTogglePubSub(checked);
            }}
            aria-label={t('PubSub')}
            data-test="pubsub-checkbox"
          />

          {/* Options expand/collapse — reveals subscriptions + cross-app fields */}
          <Button
            variant="link"
            icon={isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
            onClick={() => {
              setIsExpanded((prev) => !prev);
            }}
            data-test="options-toggle-button"
          >
            {t('Options')}
          </Button>

          <Button
            variant="plain"
            aria-label={t('Remove {{address}}', { address: addressRef.address })}
            onClick={onRemove}
            data-test="remove-address-button"
          >
            <TimesIcon />
          </Button>
        </div>
      </div>

      {/* ── Options panel ── */}
      {isExpanded && (
        <div
          data-test="pubsub-options-panel"
          style={{
            borderTop: '1px solid var(--pf-v6-global--BorderColor--100)',
            padding: 'var(--pf-v6-global--spacer--sm) var(--pf-v6-global--spacer--md)',
            background: 'var(--pf-v6-global--BackgroundColor--200)',
          }}
        >
          {/* Subscriptions — shown only when pubSub is enabled */}
          {addressRef.pubSub === true && (
            <div style={{ marginBottom: 'var(--pf-v6-global--spacer--md)' }}>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginBottom: 'var(--pf-v6-global--spacer--xs)',
                }}
              >
                {t('Subscriptions')}
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--pf-v6-global--spacer--sm)',
                  flexWrap: 'wrap',
                }}
              >
                {(addressRef.subscriptions ?? []).length > 0 && (
                  <LabelGroup>
                    {(addressRef.subscriptions ?? []).map((sub) => (
                      <Label
                        key={sub}
                        onClose={() => {
                          onRemoveSubscription(sub);
                        }}
                        closeBtnAriaLabel={t('Remove subscription {{sub}}', { sub })}
                        data-test="subscription-chip"
                      >
                        {sub}
                      </Label>
                    ))}
                  </LabelGroup>
                )}
                <TextInput
                  id={`sub-input-${addressRef.address}`}
                  value={subInput}
                  onChange={(_e, val) => {
                    setSubInput(val);
                  }}
                  onKeyDown={handleSubKeyDown}
                  placeholder={t('Add subscription...')}
                  aria-label={t('Add subscription')}
                  data-test="subscription-input"
                  style={{ flex: 1, minWidth: '160px' }}
                />
              </div>
            </div>
          )}

          {/* Cross-app reference fields — independent of pubSub */}
          <Grid hasGutter>
            <GridItem span={6}>
              <FormGroup label={t('App Namespace')} fieldId={`app-namespace-${addressRef.address}`}>
                <TextInput
                  id={`app-namespace-${addressRef.address}`}
                  value={addressRef.appNamespace ?? ''}
                  onChange={(_e, val) => {
                    onChangeAppNamespace(val);
                  }}
                  placeholder={t('e.g., production')}
                  aria-label={t('App Namespace')}
                  data-test="app-namespace-input"
                />
              </FormGroup>
            </GridItem>
            <GridItem span={6}>
              <FormGroup label={t('App Name')} fieldId={`app-name-${addressRef.address}`}>
                <TextInput
                  id={`app-name-${addressRef.address}`}
                  value={addressRef.appName ?? ''}
                  onChange={(_e, val) => {
                    onChangeAppName(val);
                  }}
                  placeholder={t('e.g., orders-app')}
                  aria-label={t('App Name')}
                  data-test="app-name-input"
                />
              </FormGroup>
            </GridItem>
          </Grid>
        </div>
      )}
    </div>
  );
};
