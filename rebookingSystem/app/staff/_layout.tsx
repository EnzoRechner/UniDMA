import { Stack } from 'expo-router';
import RootWrapper from '../modal/RootWrapper';

export default function AuthenticatedLayout() {
  return (
    <RootWrapper>
      <Stack screenOptions={{ headerShown: false }} />
    </RootWrapper>
  );
}