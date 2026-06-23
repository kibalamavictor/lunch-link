/** Admin group landing — guarded by middleware (admin/university_admin). */
export default function AdminHomePage() {
  return (
    <main>
      <h1>Admin dashboard</h1>
      <form method="post" action="/auth/logout">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
