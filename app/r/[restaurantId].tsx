import { Redirect, useLocalSearchParams } from 'expo-router';

/** Deep link handler: fudi.app/r/{restaurantId} → restaurant screen */
export default function RestaurantDeepLink() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  return <Redirect href={`/restaurant/${restaurantId}`} />;
}
