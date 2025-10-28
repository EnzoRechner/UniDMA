import { Stack } from 'expo-router';
import RootWrapper from '../error/RootWrapper';

export default function AuthenticatedLayout() {
  return (
    <RootWrapper>
      <Stack screenOptions={{ headerShown: false }} />
    </RootWrapper>
  );
}