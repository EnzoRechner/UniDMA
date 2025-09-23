

import { StyleSheet, View, Button } from 'react-native';
import { useRouter } from 'expo-router';


export default function HomeScreen() {
  const router = useRouter();
  const handleLogout = () => {
    // Optionally clear any auth state here
    router.replace('/Login');
  };
  return (
    <View style={styles.container}>
      <Button title="Logout" onPress={handleLogout} color="#fff" />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11131a', // deep dark background
  },
});
