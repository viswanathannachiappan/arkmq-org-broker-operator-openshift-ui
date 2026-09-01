import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { AddressListInput } from './AddressListInput';
import {
  useBrokerAppFormState,
  useBrokerAppFormDispatch,
} from '../../../reducers/brokerapp/reducer';

/**
 * Renders the Messaging Capabilities form section for Create/Edit BrokerApp.
 * Contains the Produces To and Consumes From address-reference lists.
 * State and mutations are owned by the BrokerApp reducer via context.
 */
export const CapabilitiesSection: React.FC = () => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const state = useBrokerAppFormState();
  const dispatch = useBrokerAppFormDispatch();

  return (
    <FormSection title={t('Messaging Capabilities')}>
      <HelperText>
        <HelperTextItem>
          {t(
            'Specify the addresses your application needs to interact with. Leave empty if not applicable.',
          )}
        </HelperTextItem>
      </HelperText>

      <FormGroup label={t('Produces To')} fieldId="brokerapp-produces">
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t('Addresses where your application will send messages.')}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <AddressListInput
          field="producerOf"
          addressRefs={state.producerOf}
          dispatch={dispatch}
          placeholder={t('e.g., orders.created')}
        />
      </FormGroup>

      <FormGroup label={t('Consumes From')} fieldId="brokerapp-consumes">
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t('Queue addresses your application will consume messages from (point-to-point).')}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <AddressListInput
          field="consumerOf"
          addressRefs={state.consumerOf}
          dispatch={dispatch}
          placeholder={t('e.g., payments.pending')}
        />
      </FormGroup>
    </FormSection>
  );
};
