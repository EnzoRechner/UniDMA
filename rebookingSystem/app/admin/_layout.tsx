import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { Stack } from 'expo-router'

const AdminLayout = () => {
  return (

      <Stack>
         <Stack.Screen name='manageStaff'/>
         <Stack.Screen name='staff'/>
         <Stack.Screen name='app-settings'/>
         <Stack.Screen name='branch-settings'/>
      </Stack>
      
  )
}

export default AdminLayout

const styles = StyleSheet.create({})