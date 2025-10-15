import { Redirect } from "expo-router";

export default function Index() {
  // Always redirect to login page
  return <Redirect href="./auth/auth-login" />;
}