import Constants from 'expo-constants';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

export default function HomeScreen() {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={[styles.container, dark ? styles.dark : styles.light]}>
      <Text style={dark ? styles.darkText : styles.lightText}>{Constants.expoConfig?.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: { backgroundColor: '#ffffff' },
  dark: { backgroundColor: '#000000' },
  lightText: { color: '#000000' },
  darkText: { color: '#ffffff' },
});
