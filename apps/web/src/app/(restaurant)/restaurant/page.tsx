/** Restaurant group landing — guarded by middleware (restaurant_staff/_manager). */
export default function RestaurantHomePage() {
  return (
    <main>
      <h1>Restaurant dashboard</h1>
      <form method="post" action="/auth/logout">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
