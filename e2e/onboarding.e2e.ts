/**
 * First Detox e2e spec.
 *
 * Prerequisites (one-time, per platform):
 *   npx expo prebuild --platform ios    # generates the native project
 *   npx expo prebuild --platform android
 *
 * Then run against a booted simulator/emulator:
 *   npm run e2e:ios     # or npm run e2e:android
 *
 * The app must be reachable (Metro not required for release builds; for
 * debug builds start it with `npm start` first, or Detox launches it).
 */
describe('Onboarding', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('boots to the onboarding screen and shows the value proposition', async () => {
    await expect(element(by.text('Remittance'))).toBeVisible();
    await expect(element(by.text(/Send money across borders/))).toBeVisible();
    await expect(element(by.text('I have an account — sign in'))).toBeVisible();
    await expect(element(by.text('Create a new wallet'))).toBeVisible();
  });

  it('navigates to auth when the user chooses to sign in', async () => {
    await element(by.text('I have an account — sign in')).tap();
    await expect(element(by.text('Sign in'))).toBeVisible();
    await expect(element(by.text('Choose how your account keys are held.'))).toBeVisible();
  });
});