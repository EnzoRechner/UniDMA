import { Stack } from 'expo-router';
import RootWrapper from '../error/RootWrapper';

export default function AuthenticatedLayout() {
  return (
    // Wrap the entire stack with your RootWrapper
    <RootWrapper>
      <Stack screenOptions={{ headerShown: false }} />
    </RootWrapper>
  );
}