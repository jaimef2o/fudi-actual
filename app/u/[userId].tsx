import { Redirect, useLocalSearchParams } from 'expo-router';

/** Deep link handler: savry.app/u/{userId} → profile screen */
export default function UserDeepLink() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <Redirect href={`/profile/${userId}`} />;
}
