import { Redirect, useLocalSearchParams } from 'expo-router';

/** Deep link handler: fudi.app/post/{visitId} → visit detail screen */
export default function PostDeepLink() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  return <Redirect href={`/visit/${visitId}`} />;
}
