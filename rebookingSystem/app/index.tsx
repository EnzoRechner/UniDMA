import { Redirect } from "expo-router";

export default function Index() {
  // Always redirect to login page
  return <Redirect href="/login-related/login-page" />;
}