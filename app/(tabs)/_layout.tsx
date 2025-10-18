import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import React from "react";
import { DynamicColorIOS, Platform } from "react-native";


export default function TabLayout() {

  return (
    <NativeTabs
      labelStyle={
        Platform.OS === "ios"
          ? {
              color: DynamicColorIOS({
                dark: "white",
                light: "black",
              }),
            }
          : undefined
      }
    >
      <NativeTabs.Trigger name="index">
        <Label>Top</Label>
        {Platform.select({
          ios: <Icon sf={{ default: "house", selected: "house.fill" }} />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name="home" />} />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="new">
        <Label>New</Label>
        {Platform.select({
          ios: <Icon sf={{ default: "clock", selected: "clock.fill" }} />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name="schedule" />} />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="best">
        <Label>Best</Label>
        {Platform.select({
          ios: <Icon sf={{ default: "star", selected: "star.fill" }} />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name="star" />} />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ask">
        <Label>Ask</Label>
        {Platform.select({
          ios: (
            <Icon
              sf={{
                default: "questionmark.circle",
                selected: "questionmark.circle.fill",
              }}
            />
          ),
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name="help" />} />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <Label>Search</Label>
        {Platform.select({
          ios: (
            <Icon
              sf={{ default: "magnifyingglass", selected: "magnifyingglass" }}
            />
          ),
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name="search" />} />
          ),
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
