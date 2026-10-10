import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../../lib/theme';
import { useAuth } from '../../store/auth';

export default function TabsLayout() {
  const session = useAuth((s) => s.session);
  if (!session) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.dim,
        tabBarStyle: { backgroundColor: colors.stage, borderTopColor: colors.line, height: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.stage },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'radio' : 'radio-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Share',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.share, focused && styles.shareOn]}>
              <Ionicons name="add" size={24} color={colors.amberInk} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  share: {
    width: 40,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  shareOn: { opacity: 1, transform: [{ scale: 1.05 }] },
});
