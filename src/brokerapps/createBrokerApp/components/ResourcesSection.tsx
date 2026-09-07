import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FormGroup,
  FormHelperText,
  FormSection,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import {
  useBrokerAppFormState,
  useBrokerAppFormDispatch,
} from '../../../reducers/brokerapp/reducer';
import { validateResourceQuantity } from '../../../validation/k8s';

export const ResourcesSection: React.FC = () => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const state = useBrokerAppFormState();
  const dispatch = useBrokerAppFormDispatch();

  const cpuRequestError = validateResourceQuantity(state.cpuRequest) ?? undefined;
  const cpuLimitError = validateResourceQuantity(state.cpuLimit) ?? undefined;
  const memoryRequestError = validateResourceQuantity(state.memoryRequest) ?? undefined;
  const memoryLimitError = validateResourceQuantity(state.memoryLimit) ?? undefined;

  return (
    <FormSection title={t('Resources')}>
      <Grid hasGutter>
        <GridItem span={6}>
          <FormGroup label={t('CPU Request')} fieldId="brokerapp-cpu-request">
            <TextInput
              id="brokerapp-cpu-request"
              value={state.cpuRequest}
              onChange={(_e, val) => {
                dispatch({ type: 'SET_CPU_REQUEST', payload: val });
              }}
              placeholder={t('e.g., 250m')}
              validated={cpuRequestError ? 'error' : 'default'}
              data-test="brokerapp-cpu-request"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={cpuRequestError ? 'error' : 'default'}>
                  {cpuRequestError ?? ''}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </GridItem>

        <GridItem span={6}>
          <FormGroup label={t('CPU Limit')} fieldId="brokerapp-cpu-limit">
            <TextInput
              id="brokerapp-cpu-limit"
              value={state.cpuLimit}
              onChange={(_e, val) => {
                dispatch({ type: 'SET_CPU_LIMIT', payload: val });
              }}
              placeholder={t('e.g., 500m')}
              validated={cpuLimitError ? 'error' : 'default'}
              data-test="brokerapp-cpu-limit"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={cpuLimitError ? 'error' : 'default'}>
                  {cpuLimitError ?? ''}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </GridItem>

        <GridItem span={6}>
          <FormGroup label={t('Memory Request')} fieldId="brokerapp-memory-request">
            <TextInput
              id="brokerapp-memory-request"
              value={state.memoryRequest}
              onChange={(_e, val) => {
                dispatch({ type: 'SET_MEMORY_REQUEST', payload: val });
              }}
              placeholder={t('e.g., 256Mi')}
              validated={memoryRequestError ? 'error' : 'default'}
              data-test="brokerapp-memory-request"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={memoryRequestError ? 'error' : 'default'}>
                  {memoryRequestError ?? ''}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </GridItem>

        <GridItem span={6}>
          <FormGroup label={t('Memory Limit')} fieldId="brokerapp-memory-limit">
            <TextInput
              id="brokerapp-memory-limit"
              value={state.memoryLimit}
              onChange={(_e, val) => {
                dispatch({ type: 'SET_MEMORY_LIMIT', payload: val });
              }}
              placeholder={t('e.g., 512Mi')}
              validated={memoryLimitError ? 'error' : 'default'}
              data-test="brokerapp-memory-limit"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={memoryLimitError ? 'error' : 'default'}>
                  {memoryLimitError ?? ''}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </GridItem>
      </Grid>
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            {t(
              'Kubernetes resource requests and limits for the broker allocation. Use standard quantity format (e.g., 500m, 2Gi).',
            )}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormSection>
  );
};
