/** Student group landing — guarded by middleware (role: student). */
export default function StudentHomePage() {
  return (
    <main>
      <h1>Student dashboard</h1>
      <form method="post" action="/auth/logout">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
