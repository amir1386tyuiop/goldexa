import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function HomeScreen() {
  return null
}

function ShopScreen() {
  return null
}

function ARScreen() {
  return null
}

function ProfileScreen() {
  return null
}

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="خانه" component={HomeScreen} />
      <Tab.Screen name="فروشگاه" component={ShopScreen} />
      <Tab.Screen name="پرو مجازی" component={ARScreen} />
      <Tab.Screen name="پروفایل" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
