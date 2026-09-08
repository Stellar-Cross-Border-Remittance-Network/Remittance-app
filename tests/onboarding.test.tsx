import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { OnboardingScreen } from '../src/screens/OnboardingScreen';

function makeProps(navigate: jest.Mock) {
  return {
    navigation: { navigate, goBack: jest.fn(), reset: jest.fn(), replace: jest.fn(), setOptions: jest.fn() },
    route: { key: 'Onboarding', name: 'Onboarding' as const, params: undefined },
  } as unknown as Parameters<typeof OnboardingScreen>[0];
}

describe('OnboardingScreen', () => {
  it('renders the value proposition and CTA', async () => {
    const navigate = jest.fn();
    const { getByText } = await render(<OnboardingScreen {...makeProps(navigate)} />);
    expect(getByText('Remittance')).toBeTruthy();
    expect(getByText(/Send money across borders/)).toBeTruthy();
  });

  it('navigates to auth on sign-in', async () => {
    const navigate = jest.fn();
    const { getByText } = await render(<OnboardingScreen {...makeProps(navigate)} />);
    fireEvent.press(getByText('I have an account — sign in'));
    expect(navigate).toHaveBeenCalledWith('Auth', { custody: 'non_custodial' });
  });

  it('navigates to wallet creation on create', async () => {
    const navigate = jest.fn();
    const { getByText } = await render(<OnboardingScreen {...makeProps(navigate)} />);
    fireEvent.press(getByText('Create a new wallet'));
    expect(navigate).toHaveBeenCalledWith('Auth', { custody: 'non_custodial' });
  });
});