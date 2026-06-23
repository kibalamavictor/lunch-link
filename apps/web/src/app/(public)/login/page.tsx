/**
 * Minimal login form (server-rendered). UI polish is a separate task; this
 * posts to the /auth/login route handler which performs the sign-in.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main>
      <h1>Sign in to LunchLink</h1>
      {error ? <p role="alert">Invalid email or password.</p> : null}
      <form method="post" action="/auth/login">
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
